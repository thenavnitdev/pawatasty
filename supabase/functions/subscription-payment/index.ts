import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePaymentIntentRequest {
  amount: number;
  planName: string;
  billingFrequency: string;
  paymentMethod?: 'card' | 'ideal' | 'applepay' | 'googlepay' | 'paypal';
  returnUrl?: string;
}

interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not configured in Supabase secrets');
      return new Response(
        JSON.stringify({
          error: 'Payment processing is not configured. Please add STRIPE_SECRET_KEY to your Supabase project secrets.',
          configured: false,
          hint: 'Go to your Supabase Dashboard, Project Settings, Edge Functions, Manage secrets and add STRIPE_SECRET_KEY'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'POST' && path.includes('/create-intent')) {
      const body: CreatePaymentIntentRequest = await req.json();

      const { data: userData } = await supabase
        .from('users')
        .select('email, stripe_customer_id')
        .eq('id', user.id)
        .single();

      let stripeCustomerId = userData?.stripe_customer_id;

      if (!stripeCustomerId) {
        const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: userData?.email || user.email || '',
            'metadata[user_id]': user.id,
          }),
        });

        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          console.error('Stripe customer creation failed:', errorData);
          throw new Error('Failed to create Stripe customer');
        }

        const customer = await customerResponse.json();
        stripeCustomerId = customer.id;

        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);
      }

      // SUBSCRIPTION PAYMENT: Charge FULL package price upfront immediately
      // For Silver/Gold plans: charge complete monthly/annual amount
      const paymentIntentParams: Record<string, string> = {
        amount: body.amount.toString(), // Full subscription price (e.g., €9.99 or €99 for annual)
        currency: 'eur',
        customer: stripeCustomerId,
        'metadata[type]': 'subscription_payment',
        'metadata[user_id]': user.id,
        'metadata[plan_name]': body.planName,
        'metadata[billing_frequency]': body.billingFrequency,
        description: `${body.planName} subscription - ${body.billingFrequency} - Full payment upfront`,
      };

      console.log('Creating PaymentIntent for method:', body.paymentMethod);

      switch (body.paymentMethod) {
        case 'ideal':
          console.log('Setting up for iDeal payment');
          paymentIntentParams['payment_method_types[]'] = 'ideal';
          break;

        case 'card':
          console.log('Setting up for Card payment');
          paymentIntentParams['payment_method_types[]'] = 'card';
          paymentIntentParams['setup_future_usage'] = 'off_session';
          break;

        case 'applepay':
          console.log('Setting up for Apple Pay');
          paymentIntentParams['payment_method_types[]'] = 'card';
          paymentIntentParams['setup_future_usage'] = 'off_session';
          break;

        case 'googlepay':
          console.log('Setting up for Google Pay');
          paymentIntentParams['payment_method_types[]'] = 'card';
          paymentIntentParams['setup_future_usage'] = 'off_session';
          break;

        case 'paypal':
          console.log('Setting up for PayPal payment');
          paymentIntentParams['payment_method_types[]'] = 'paypal';
          break;

        default:
          console.log('Unknown payment method, defaulting to card');
          paymentIntentParams['payment_method_types[]'] = 'card';
          paymentIntentParams['setup_future_usage'] = 'off_session';
          break;
      }

      const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(paymentIntentParams),
      });

      if (!paymentIntentResponse.ok) {
        const error = await paymentIntentResponse.json();
        console.error('Stripe PaymentIntent creation failed:', error);
        throw new Error('Failed to create payment intent');
      }

      const paymentIntent = await paymentIntentResponse.json();

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET' && path.includes('/verify')) {
      const paymentIntentId = url.searchParams.get('payment_intent');

      if (!paymentIntentId) {
        return new Response(
          JSON.stringify({ error: 'Missing payment_intent parameter' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const paymentIntentResponse = await fetch(
        `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!paymentIntentResponse.ok) {
        throw new Error('Failed to verify payment intent');
      }

      const paymentIntent = await paymentIntentResponse.json();

      return new Response(
        JSON.stringify({
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST' && path.includes('/confirm')) {
      console.log('=== CONFIRM PAYMENT START ===');
      const body: ConfirmPaymentRequest = await req.json();
      console.log('Request body:', body);

      if (!body.paymentIntentId || !body.paymentMethodId) {
        console.error('Missing required fields');
        return new Response(
          JSON.stringify({ error: 'Missing paymentIntentId or paymentMethodId' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Verifying payment intent with Stripe');
      const paymentIntentResponse = await fetch(
        `https://api.stripe.com/v1/payment_intents/${body.paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!paymentIntentResponse.ok) {
        console.error('Failed to fetch payment intent from Stripe');
        throw new Error('Failed to verify payment intent');
      }

      const paymentIntent = await paymentIntentResponse.json();
      console.log('Payment intent status:', paymentIntent.status);

      if (paymentIntent.status !== 'succeeded') {
        console.error('Payment not succeeded. Status:', paymentIntent.status);
        return new Response(
          JSON.stringify({
            error: 'Payment not completed',
            status: paymentIntent.status
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Payment succeeded');

      const planName = paymentIntent.metadata.plan_name;
      const billingFrequency = paymentIntent.metadata.billing_frequency;

      let newLevel = 'flex';
      if (planName.toLowerCase().includes('gold')) {
        newLevel = 'gold';
      } else if (planName.toLowerCase().includes('silver')) {
        newLevel = 'silver';
      }

      console.log('Fetching pricing plan from database');
      const { data: pricingPlan, error: pricingError } = await supabase
        .from('membership_pricing')
        .select('*')
        .eq('tier', newLevel)
        .single();

      if (pricingError) {
        console.error('Failed to fetch pricing plan:', pricingError);
        throw pricingError;
      }

      const startDate = new Date();
      const endDate = new Date(startDate);

      if (pricingPlan && billingFrequency === 'annually') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (pricingPlan && billingFrequency === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      console.log('Updating user_memberships table');
      const { error: membershipError } = await supabase
        .from('user_memberships')
        .upsert({
          user_id: user.id,
          membership_tier: newLevel,
          subscription_status: 'active',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (membershipError) {
        console.error('Failed to update user_memberships:', membershipError);
        throw membershipError;
      }

      console.log('Updating users table');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription: newLevel,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update users table:', updateError);
        throw updateError;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      const { data: existingPM } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .eq('stripe_payment_method_id', body.paymentMethodId)
        .maybeSingle();

      if (!existingPM) {
        const pmResponse = await fetch(
          `https://api.stripe.com/v1/payment_methods/${body.paymentMethodId}`,
          {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          }
        );

        if (pmResponse.ok) {
          const pm = await pmResponse.json();

          if (pm.customer !== userData?.stripe_customer_id) {
            console.error(`Payment method customer mismatch during save. Expected: ${userData?.stripe_customer_id}, Got: ${pm.customer}`);
            console.log('Skipping payment method save due to customer mismatch');
          } else if (pm.type === 'card') {
            const { data: existingMethods } = await supabase
              .from('payment_methods')
              .select('id')
              .eq('user_id', user.id);

            const isFirstCard = !existingMethods || existingMethods.length === 0;

            await supabase
              .from('payment_methods')
              .insert({
                user_id: user.id,
                type: 'card',
                last_four: pm.card.last4,
                card_brand: pm.card.brand,
                expiry_month: pm.card.exp_month,
                expiry_year: pm.card.exp_year,
                stripe_payment_method_id: body.paymentMethodId,
                is_primary: isFirstCard,
              });
          }
        }
      }

      console.log('Payment confirmation complete');
      console.log('=== CONFIRM PAYMENT END ===');

      return new Response(
        JSON.stringify({
          success: true,
          membershipLevel: newLevel,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Subscription payment error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
