import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.replace("/subscriptions", "");

    if (path === "/plans" && req.method === "GET") {
      const { data: plans, error } = await supabase
        .from("membership_pricing")
        .select("*")
        .eq("is_active", true)
        .order("tier", { ascending: true });

      if (error) {
        console.error("Error fetching plans:", error);
        throw error;
      }

      const formattedPlans = plans.map((plan: any) => ({
        id: plan.id,
        name: plan.display_name,
        type: plan.subscription_interval || "flex",
        price: plan.subscription_price_cents
          ? (plan.subscription_price_cents / 100).toFixed(2)
          : plan.validation_fee_cents
            ? (plan.validation_fee_cents / 100).toFixed(2)
            : "0.00",
        minutes: plan.daily_free_minutes || 0,
        dailyFreeMinutes: plan.daily_free_minutes || 0,
        features: plan.features || [],
        penaltyFee: plan.late_return_penalty_cents
          ? plan.late_return_penalty_cents / 100
          : 50,
        sortOrder: plan.tier === "flex" ? 1 : plan.tier === "silver" ? 2 : 3,
        tier: plan.tier,
        stripeProductId: plan.stripe_product_id,
        stripePriceId: plan.stripe_price_id,
      }));

      return new Response(JSON.stringify(formattedPlans), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Missing authorization header");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Unauthorized");
      }

      const body = await req.json();
      const { tier, paymentMethodId } = body;

      if (!tier) {
        throw new Error("Missing tier parameter");
      }

      const { data: planData, error: planError } = await supabase
        .from("membership_pricing")
        .select("*")
        .eq("tier", tier)
        .eq("is_active", true)
        .single();

      if (planError || !planData) {
        throw new Error("Invalid subscription tier");
      }

      if (!planData.stripe_price_id) {
        throw new Error("Stripe Price ID not configured for this tier");
      }

      const levelMap: Record<string, number> = {
        flex: 1,
        silver: 2,
        gold: 3,
      };

      const newLevel = levelMap[tier] || 1;

      if (tier.toLowerCase() === 'flex') {
        console.log(`🔄 Processing free downgrade to Flex plan for user ${user.id}`);

        const startDate = new Date();

        const { error: updateError } = await supabase
          .from("users")
          .update({
            subscription: tier,
            current_level: newLevel,
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating user subscription:", updateError);
          throw updateError;
        }

        await supabase
          .from("user_memberships")
          .upsert({
            user_id: user.id,
            membership_tier: tier,
            subscription_status: "active",
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: null,
            stripe_subscription_id: null,
          });

        console.log(`✅ Free downgrade to Flex completed for user ${user.id}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Downgraded to Flex plan successfully",
            tier: tier,
            level: newLevel,
            amount: 0,
            paymentIntentId: null,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!paymentMethodId) {
        throw new Error("Missing payment method");
      }

      const { data: paymentMethod, error: pmError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("id", paymentMethodId)
        .eq("user_id", user.id)
        .eq("payment_method_status", "active")
        .single();

      if (pmError || !paymentMethod) {
        throw new Error("Invalid payment method");
      }

      const { data: userData } = await supabase
        .from("users")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      if (!userData?.stripe_customer_id) {
        throw new Error("Stripe customer not found");
      }

      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeSecretKey) {
        throw new Error("Payment processing not configured");
      }

      const amount = planData.subscription_price_cents;
      const interval = planData.subscription_interval || "month";

      const subscriptionResponse = await fetch("https://api.stripe.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: userData.stripe_customer_id,
          "items[0][price]": planData.stripe_price_id,
          default_payment_method: paymentMethod.stripe_payment_method_id,
          "metadata[user_id]": user.id,
          "metadata[tier]": tier,
          expand: "latest_invoice.payment_intent",
        }),
      });

      if (!subscriptionResponse.ok) {
        const error = await subscriptionResponse.json();
        throw new Error(error.error?.message || "Subscription creation failed");
      }

      const subscription = await subscriptionResponse.json();

      if (subscription.status !== "active" && subscription.status !== "trialing") {
        throw new Error(`Subscription status: ${subscription.status}`);
      }

      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);

      const { error: updateError } = await supabase
        .from("users")
        .update({
          subscription: tier,
          current_level: newLevel,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating user subscription:", updateError);
        throw updateError;
      }

      await supabase
        .from("user_memberships")
        .upsert({
          user_id: user.id,
          membership_tier: tier,
          subscription_status: subscription.status,
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          stripe_subscription_id: subscription.id,
          stripe_payment_method_id: paymentMethod.stripe_payment_method_id,
        });

      console.log(`✅ Subscription created: ${subscription.id} - ${tier} - €${amount / 100}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription created successfully",
          tier: tier,
          level: newLevel,
          amount: amount / 100,
          subscriptionId: subscription.id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Subscription error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
