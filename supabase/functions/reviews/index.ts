import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateReviewRequest {
  merchantId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  images?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader ? {
        global: {
          headers: { Authorization: authHeader },
        },
      } : {},
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && pathParts.length === 3 && pathParts[1] === "merchant") {
      const merchantId = pathParts[2];

      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("target_type", "merchant")
        .eq("target_id", merchantId)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      const reviewsWithUsers = await Promise.all(
        (reviews || []).map(async (review: any) => {
          const { data: user } = await supabase
            .from("users")
            .select("first_name, last_name, full_name")
            .eq("user_id", review.user_id)
            .maybeSingle();

          return {
            id: review.id,
            merchantId: merchantId,
            userId: review.user_id,
            userName: user
              ? (user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : user.full_name || 'Anonymous')
              : 'Anonymous',
            rating: review.rating,
            comment: review.comment,
            images: review.images || [],
            createdAt: review.created_at,
            updatedAt: review.updated_at,
          };
        })
      );

      return new Response(JSON.stringify(reviewsWithUsers), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "user") {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          *,
          merchants!inner(merchant_id, company_name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      const formattedReviews = reviews.map((review: any) => ({
        id: review.id,
        merchantId: review.merchants.merchant_id,
        merchantName: review.merchants.company_name,
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      }));

      return new Response(JSON.stringify(formattedReviews), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (req.method === "POST" && pathParts.length === 1) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const body: CreateReviewRequest = await req.json();

      if (body.rating < 1 || body.rating > 5) {
        return new Response(
          JSON.stringify({ error: "Rating must be between 1 and 5" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("merchant_id")
        .eq("merchant_id", body.merchantId)
        .maybeSingle();

      if (merchantError) throw merchantError;
      if (!merchant) {
        return new Response(
          JSON.stringify({ error: "Merchant not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_type", "merchant")
        .eq("target_id", body.merchantId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return new Response(
          JSON.stringify({ error: "You have already reviewed this merchant" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const insertData: any = {
        user_id: user.id,
        target_type: "merchant",
        target_id: body.merchantId,
        rating: body.rating,
        comment: body.comment,
      };

      if (body.images && body.images.length > 0) {
        insertData.images = JSON.stringify(body.images);
      }

      const { data: review, error: createError } = await supabase
        .from("reviews")
        .insert(insertData)
        .select()
        .single();

      if (createError) throw createError;

      return new Response(
        JSON.stringify({
          id: review.id,
          merchantId: body.merchantId,
          rating: review.rating,
          comment: review.comment,
          images: review.images || [],
          createdAt: review.created_at,
        }),
        {
          status: 201,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "PUT" && pathParts.length === 2) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const reviewId = pathParts[1];
      const body: UpdateReviewRequest = await req.json();

      if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
        return new Response(
          JSON.stringify({ error: "Rating must be between 1 and 5" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const updateData: any = {};
      if (body.rating !== undefined) updateData.rating = body.rating;
      if (body.comment !== undefined) updateData.comment = body.comment;
      if (body.images !== undefined) {
        updateData.images = body.images.length > 0 ? JSON.stringify(body.images) : '[]';
      }

      const { data: review, error: updateError } = await supabase
        .from("reviews")
        .update(updateData)
        .eq("id", reviewId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          id: review.id,
          merchantId: review.target_id,
          rating: review.rating,
          comment: review.comment,
          images: review.images || [],
          updatedAt: review.updated_at,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "DELETE" && pathParts.length === 2) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const reviewId = pathParts[1];

      const { error: deleteError } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: "Review deleted successfully" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
