import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AwardPointsRequest {
  userId: string;
  eventType: "referral_activated" | "rental_completed" | "booking_completed" | "welcome_new_joiner";
  metadata?: {
    bookingId?: string;
    rentalId?: string;
    referredUserId?: string;
  };
}

interface AwardPointsResponse {
  success: boolean;
  message: string;
  pointsAwarded: number;
  newBalance: number;
}

const POINTS_MAP = {
  referral_activated: 25,
  rental_completed: 30,
  booking_completed: 30,
  welcome_new_joiner: 30,
};

const DESCRIPTION_MAP = {
  referral_activated: "A new friend has joined using your referral code.",
  rental_completed: "Thank you for returning the power bank to the hub.",
  booking_completed: "Thank you for completing your booking.",
  welcome_new_joiner: "Welcome to Pawatasty!",
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

    const body: AwardPointsRequest = await req.json();
    const { userId, eventType, metadata } = body;

    if (!userId || !eventType) {
      return new Response(
        JSON.stringify({ error: "userId and eventType are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!POINTS_MAP[eventType]) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pointsToAward = POINTS_MAP[eventType];
    const description = DESCRIPTION_MAP[eventType];

    // Check for duplicate transactions based on event type and metadata
    if (eventType === "booking_completed" && metadata?.bookingId) {
      const { data: existingTransaction } = await supabase
        .from("points_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("source", "booking")
        .eq("description", description)
        .ilike("description", `%${metadata.bookingId}%`)
        .maybeSingle();

      if (existingTransaction) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Points already awarded for this booking",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Insert points transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: userId,
        amount: pointsToAward,
        type: "earned",
        source: eventType === "referral_activated" ? "referral" :
                eventType === "booking_completed" ? "booking" :
                eventType === "rental_completed" ? "subscription" : "promo",
        description: description,
      });

    if (transactionError) {
      throw transactionError;
    }

    // Get updated user balance
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("available_points, total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    const response: AwardPointsResponse = {
      success: true,
      message: `Successfully awarded ${pointsToAward} points!`,
      pointsAwarded: pointsToAward,
      newBalance: userData?.available_points || pointsToAward,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error awarding points:", error);
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
