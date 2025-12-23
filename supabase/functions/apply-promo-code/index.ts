import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ApplyPromoCodeRequest {
  promoCode: string;
  orderAmount?: number;
}

interface ApplyPromoCodeResponse {
  success: boolean;
  message: string;
  pointsEarned?: number;
  code?: string;
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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: ApplyPromoCodeRequest = await req.json();
    const { promoCode } = body;

    if (!promoCode) {
      return new Response(
        JSON.stringify({ error: "Promo code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const upperPromoCode = promoCode.toUpperCase();

    // Check if user signed up within 24 hours
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("user_id, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentUserError) {
      throw currentUserError;
    }

    if (!currentUser) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate time difference in hours
    const signupTime = new Date(currentUser.created_at);
    const currentTime = new Date();
    const hoursSinceSignup = (currentTime.getTime() - signupTime.getTime()) / (1000 * 60 * 60);

    // Check if user is within 24-hour window
    if (hoursSinceSignup > 24) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This promo code is valid only for new users within 24 hours of joining.",
          code: "OUTSIDE_24_HOUR_WINDOW",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch from users table (consolidated location)
    const { data: userWithPromo, error: userPromoError } = await supabase
      .from("users")
      .select("user_id, referral_count, total_points_earned")
      .eq("promo_code", upperPromoCode)
      .maybeSingle();

    if (userPromoError) {
      throw userPromoError;
    }

    if (!userWithPromo) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid promo code",
          code: "INVALID_PROMO_CODE",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (userWithPromo.user_id === user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "You cannot use your own promo code",
          code: "SELF_REFERRAL",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_id", userWithPromo.user_id)
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existingReferral) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "You have already used this promo code",
          code: "ALREADY_USED",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const referralPoints = 25;

    const { error: referralInsertError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: userWithPromo.user_id,
        referred_user_id: user.id,
        status: "completed",
        points_earned: referralPoints,
        completed_at: new Date().toISOString(),
      });

    if (referralInsertError) {
      throw referralInsertError;
    }

    // Award points to the referred user (new user who used the promo code)
    const { error: referredTransactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: user.id,
        amount: referralPoints,
        type: "earned",
        source: "referral",
        description: `Signup bonus for using promo code ${upperPromoCode}`,
      });

    if (referredTransactionError) {
      throw referredTransactionError;
    }

    // Note: Points for the referrer are automatically awarded by the trigger
    // The trigger on referrals table will create a points_transaction for the referrer
    // The trigger on points_transactions will update the users table automatically

    // Update referral count only (points are handled by triggers)
    const { error: updateUserError } = await supabase
      .from("users")
      .update({
        referral_count: (userWithPromo.referral_count || 0) + 1,
      })
      .eq("user_id", userWithPromo.user_id);

    if (updateUserError) {
      throw updateUserError;
    }

    const response: ApplyPromoCodeResponse = {
      success: true,
      message: `Promo code applied successfully! You earned ${referralPoints} points.`,
      pointsEarned: referralPoints,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error applying promo code:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
