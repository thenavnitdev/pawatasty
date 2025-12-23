import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
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

    const userId = user.id;

    const url = new URL(req.url);
    const pathname = url.pathname;

    console.log("📍 Request:", {
      method: req.method,
      pathname,
      userId
    });

    const pathMatch = pathname.match(/\/liked-merchants\/(.+)$/);
    const merchantId = pathMatch ? pathMatch[1] : null;

    if (req.method === "GET" && !merchantId) {
      console.log("GET: Fetching all liked merchants for user", userId);

      const { data: likedRecords, error: likedError } = await supabaseClient
        .from("liked_merchants")
        .select("merchant_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (likedError) {
        console.error("Error fetching likes:", likedError);
        throw likedError;
      }

      if (!likedRecords || likedRecords.length === 0) {
        return new Response(JSON.stringify([]), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const merchantIds = likedRecords.map(r => r.merchant_id);

      const { data: merchants, error: merchantsError } = await supabaseClient
        .from("merchants")
        .select("merchant_id, company_name, company_specialty, business_type, subcategory_name, address, latitude, longitude, phone_nr, website, open_days, open_time, logo_id, cover_image_ids, rating")
        .in("merchant_id", merchantIds);

      if (merchantsError) {
        console.error("Error fetching merchants:", merchantsError);
        throw merchantsError;
      }

      // Fetch branch data for these merchants
      const { data: branches, error: branchesError } = await supabaseClient
        .from("merchant_branches")
        .select("merchant_id, branch_id, cover_image_ids, latitude, longitude, address")
        .in("merchant_id", merchantIds);

      if (branchesError) {
        console.log("Warning: Could not fetch branches:", branchesError);
      }

      // Create a map of merchant_id to their first branch (if any)
      const branchMap = new Map();
      if (branches) {
        for (const branch of branches) {
          if (!branchMap.has(branch.merchant_id)) {
            branchMap.set(branch.merchant_id, branch);
          }
        }
      }

      const merchantMap = new Map(merchants?.map(m => [m.merchant_id, m]) || []);

      const formattedLikedMerchants = likedRecords
        .map((lm) => {
          const merchant = merchantMap.get(lm.merchant_id);
          if (!merchant) return null;

          const branch = branchMap.get(lm.merchant_id);

          // Priority: branch cover_image_ids -> merchant cover_image_ids -> merchant logo_id
          let coverImageIds = [];

          // Try branch cover images first
          if (branch?.cover_image_ids) {
            try {
              coverImageIds = typeof branch.cover_image_ids === 'string'
                ? JSON.parse(branch.cover_image_ids)
                : branch.cover_image_ids;
            } catch (e) {
              console.log("Error parsing branch cover_image_ids:", e);
            }
          }

          // Fall back to merchant cover images
          if (coverImageIds.length === 0 && merchant.cover_image_ids) {
            try {
              coverImageIds = typeof merchant.cover_image_ids === 'string'
                ? JSON.parse(merchant.cover_image_ids)
                : merchant.cover_image_ids;
            } catch (e) {
              console.log("Error parsing merchant cover_image_ids:", e);
            }
          }

          // Use branch location data if available, otherwise use merchant data
          const address = branch?.address || merchant.address;
          const latitude = branch?.latitude || merchant.latitude;
          const longitude = branch?.longitude || merchant.longitude;

          return {
            id: merchant.merchant_id,
            merchantId: merchant.merchant_id,
            companyName: merchant.company_name,
            companySpecialty: merchant.company_specialty,
            businessType: merchant.business_type,
            subcategoryName: merchant.subcategory_name,
            address: address,
            latitude: latitude,
            longitude: longitude,
            phoneNr: merchant.phone_nr,
            website: merchant.website,
            openDays: merchant.open_days,
            openTime: merchant.open_time,
            logoId: merchant.logo_id,
            coverImageIds: coverImageIds,
            rating: merchant.rating || 0,
            likedAt: lm.created_at,
          };
        })
        .filter(Boolean);

      return new Response(JSON.stringify(formattedLikedMerchants), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (req.method === "POST" && merchantId) {
      console.log("POST: Like merchant", merchantId, "by user", userId);

      let actualMerchantId = merchantId;

      if (merchantId.startsWith('BR')) {
        console.log("📍 Branch ID detected, looking up parent merchant ID");
        const { data: branch, error: branchError } = await supabaseClient
          .from("merchant_branches")
          .select("merchant_id")
          .eq("branch_id", merchantId)
          .maybeSingle();

        if (branchError || !branch) {
          console.error("Branch lookup error:", branchError);
          return new Response(
            JSON.stringify({ error: "Branch not found", success: false }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        actualMerchantId = branch.merchant_id;
        console.log("📍 Using parent merchant ID:", actualMerchantId);
      }

      const { data: existing } = await supabaseClient
        .from("liked_merchants")
        .select("id")
        .eq("user_id", userId)
        .eq("merchant_id", actualMerchantId)
        .maybeSingle();

      if (existing) {
        console.log("Already liked");
        return new Response(
          JSON.stringify({ message: "Merchant already liked", success: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { error: insertError } = await supabaseClient
        .from("liked_merchants")
        .insert({
          user_id: userId,
          merchant_id: actualMerchantId,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      console.log("✅ Like created successfully");

      return new Response(
        JSON.stringify({ message: "Merchant liked successfully", success: true }),
        {
          status: 201,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "DELETE" && merchantId) {
      console.log("DELETE: Unlike merchant", merchantId, "by user", userId);

      let actualMerchantId = merchantId;

      if (merchantId.startsWith('BR')) {
        console.log("📍 Branch ID detected, looking up parent merchant ID");
        const { data: branch, error: branchError } = await supabaseClient
          .from("merchant_branches")
          .select("merchant_id")
          .eq("branch_id", merchantId)
          .maybeSingle();

        if (branchError || !branch) {
          console.error("Branch lookup error:", branchError);
          return new Response(
            JSON.stringify({ error: "Branch not found", success: false }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        actualMerchantId = branch.merchant_id;
        console.log("📍 Using parent merchant ID:", actualMerchantId);
      }

      const { error: deleteError } = await supabaseClient
        .from("liked_merchants")
        .delete()
        .eq("user_id", userId)
        .eq("merchant_id", actualMerchantId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw deleteError;
      }

      console.log("✅ Unlike successful");

      return new Response(
        JSON.stringify({ message: "Merchant unliked successfully", success: true }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log("❌ No route matched", { method: req.method, merchantId });

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
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: String(error)
      }),
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