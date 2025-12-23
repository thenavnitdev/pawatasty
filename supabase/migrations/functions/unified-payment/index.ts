import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentContext {
  type: 'subscription' | 'rental' | 'penalty' | 'deal' | 'booking' | 'topup';
  planId?: string;
  planName?: string;
  billingFrequency?: string;
  stationId?: string;
  deviceId?: string;
  penaltyId?: string;
  rentalId?: string;
  dealId?: string;
  merchantId?: string;
  guests?: number;
  bookingDate?: string;
  bookingTime?: string;
  topupAmount?: number;
  description?: string;
}

interface PricingDetails {
  basePrice: number;
  serviceFee?: number;
  discount?: number;
  tax?: number;
  totalAmount: number;
  currency: string;
  breakdown: Array<{ label: string; amount: number }>;
}

async function calculatePricing(context: PaymentContext, supabase: any): Promise<PricingDetails> {
  let basePrice = 0;
  let serviceFee = 0;
  let discount = 0;
  const tax = 0;
  const breakdown: Array<{ label: string; amount: number }> = [];

  try {
    switch (context.type) {
      case 'subscription': {
        if (!context.planName) {
          throw new Error('Plan name is required for subscription');
        }

        const tierMap: { [key: string]: string } = {
          'flex': 'flex',
          'silver': 'silver',
          'gold': 'gold',
          'Flex': 'flex',
          'Silver': 'silver',
          'Gold': 'gold',
        };

        const tier = tierMap[context.planName] || 'flex';
        const { data: pricingData, error } = await supabase
          .from('membership_pricing')
          .select('*')
          .eq('tier', tier)
          .single();

        if (error || !pricingData) {
          throw new Error('Unable to fetch subscription pricing');
        }

        basePrice = context.billingFrequency === 'monthly'
          ? pricingData.monthly_price
          : pricingData.yearly_price;

        breakdown.push({
          label: `${context.planName} Membership (${context.billingFrequency})`,
          amount: basePrice,
        });
        break;
      }

      case 'rental': {
        basePrice = 0.50;
        breakdown.push({
          label: 'Pre-authorization',
          amount: basePrice,
        });
        break;
      }

      case 'penalty': {
        if (!context.rentalId) {
          throw new Error('Rental ID is required for penalty payment');
        }

        const { data: rentalData, error } = await supabase
          .from('rentals')
          .select('penalty_amount')
          .eq('id', context.rentalId)
          .single();

        if (error || !rentalData || !rentalData.penalty_amount) {
          throw new Error('Unable to fetch penalty amount');
        }

        basePrice = rentalData.penalty_amount;
        breakdown.push({
          label: 'Late Return Penalty',
          amount: basePrice,
        });
        break;
      }

      case 'deal':
      case 'booking': {
        if (!context.dealId) {
          throw new Error('Deal ID is required for booking payment');
        }

        const { data: dealData, error } = await supabase
          .from('deals')
          .select('price, service_fee')
          .eq('id', context.dealId)
          .single();

        if (error || !dealData) {
          throw new Error('Unable to fetch deal pricing');
        }

        basePrice = dealData.price || 0;
        serviceFee = dealData.service_fee || 0;

        breakdown.push({
          label: 'Deal Price',
          amount: basePrice,
        });

        if (serviceFee > 0) {
          breakdown.push({
            label: 'Service Fee',
            amount: serviceFee,
          });
        }
        break;
      }

      case 'topup': {
        if (!context.topupAmount || context.topupAmount <= 0) {
          throw new Error('Valid top-up amount is required');
        }

        basePrice = context.topupAmount;
        breakdown.push({
          label: 'Account Top-up',
          amount: basePrice,
        });
        break;
      }

      default:
        throw new Error(`Unsupported payment context type: ${context.type}`);
    }

    const totalAmount = basePrice + serviceFee - discount + tax;

    return {
      basePrice,
      serviceFee: serviceFee || undefined,
      discount: discount || undefined,
      tax: tax || undefined,
      totalAmount,
      currency: 'eur',
      breakdown,
    };
  } catch (error) {
    console.error('Error calculating pricing:', error);
    throw error;
  }
}

function getRedirectDestination(context: PaymentContext): string {
  switch (context.type) {
    case 'subscription':
      return '/membership-success';
    case 'rental':
      return '/rental-active';
    case 'penalty':
      return '/history';
    case 'deal':
    case 'booking':
      return '/booking-confirmed';
    case 'topup':
      return '/wallet';
    default:
      return '/';
  }
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
      console.error('STRIPE_SECRET_KEY is not configured');
      return new Response(
        JSON.stringify({
          error: 'Payment processing is not configured',
          configured: false,
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
      const body = await req.json();
      const context: PaymentContext = body.context;
      const paymentMethodType = body.paymentMethodType || 'card';

      console.log('Creating payment intent for context:', context);

      const pricing = await calculatePricing(context, supabase);
      console.log('Calculated pricing:', pricing);

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
          throw new Error('Failed to create Stripe customer');
        }

        const customer = await customerResponse.json();
        stripeCustomerId = customer.id;

        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);
      }

      const amountInCents = Math.round(pricing.totalAmount * 100);
      const paymentIntentParams: Record<string, string> = {
        amount: amountInCents.toString(),
        currency: 'eur',
        customer: stripeCustomerId,
        'metadata[type]': context.type,
        'metadata[user_id]': user.id,
        description: context.description || `Payment for ${context.type}`,
      };

      if (context.planName) paymentIntentParams['metadata[plan_name]'] = context.planName;
      if (context.billingFrequency) paymentIntentParams['metadata[billing_frequency]'] = context.billingFrequency;
      if (context.dealId) paymentIntentParams['metadata[deal_id]'] = context.dealId;
      if (context.rentalId) paymentIntentParams['metadata[rental_id]'] = context.rentalId;
      if (context.penaltyId) paymentIntentParams['metadata[penalty_id]'] = context.penaltyId;

      switch (paymentMethodType) {
        case 'ideal':
          paymentIntentParams['payment_method_types[]'] = 'ideal';
          break;
        case 'paypal':
          paymentIntentParams['payment_method_types[]'] = 'paypal';
          break;
        case 'card':
        case 'applepay':
        case 'googlepay':
        default:
          paymentIntentParams['payment_method_types[]'] = 'card';
          if (context.type !== 'rental') {
            paymentIntentParams['setup_future_usage'] = 'off_session';
          }
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
          pricing,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST' && path.includes('/confirm')) {
      console.log('=== CONFIRM PAYMENT START ===');
      const body = await req.json();
      const { paymentIntentId, paymentMethodId, context } = body;

      if (!paymentIntentId || !paymentMethodId || !context) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
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

      if (paymentIntent.status !== 'succeeded') {
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

      console.log('Payment succeeded for context:', context.type);

      let resultData: any = {};

      switch (context.type) {
        case 'subscription': {
          const planName = context.planName || paymentIntent.metadata.plan_name;
          const billingFrequency = context.billingFrequency || paymentIntent.metadata.billing_frequency;

          let newLevel = 'flex';
          if (planName?.toLowerCase().includes('gold')) {
            newLevel = 'gold';
          } else if (planName?.toLowerCase().includes('silver')) {
            newLevel = 'silver';
          }

          const { data: pricingPlan } = await supabase
            .from('membership_pricing')
            .select('*')
            .eq('tier', newLevel)
            .single();

          const startDate = new Date();
          const endDate = new Date(startDate);

          if (pricingPlan && billingFrequency === 'annually') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else if (pricingPlan && billingFrequency === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          }

          await supabase
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

          await supabase
            .from('users')
            .update({ subscription: newLevel })
            .eq('user_id', user.id);

          resultData = { membershipLevel: newLevel };
          break;
        }

        case 'penalty': {
          if (context.rentalId) {
            await supabase
              .from('rentals')
              .update({ penalty_paid: true })
              .eq('id', context.rentalId);
          }
          break;
        }

        case 'deal':
        case 'booking': {
          if (context.dealId) {
            const { data: booking } = await supabase
              .from('deal_bookings')
              .insert({
                user_id: user.id,
                deal_id: context.dealId,
                merchant_id: context.merchantId,
                guests: context.guests || 1,
                booking_date: context.bookingDate,
                booking_time: context.bookingTime,
                payment_status: 'paid',
                payment_intent_id: paymentIntentId,
              })
              .select()
              .single();

            resultData = { bookingId: booking?.id };
          }
          break;
        }

        case 'topup': {
          if (context.topupAmount) {
            const { data: currentUser } = await supabase
              .from('users')
              .select('wallet_balance')
              .eq('id', user.id)
              .single();

            const currentBalance = currentUser?.wallet_balance || 0;
            const newBalance = currentBalance + context.topupAmount;

            await supabase
              .from('users')
              .update({ wallet_balance: newBalance })
              .eq('id', user.id);

            resultData = { newBalance };
          }
          break;
        }
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
        .eq('stripe_payment_method_id', paymentMethodId)
        .maybeSingle();

      if (!existingPM) {
        const pmResponse = await fetch(
          `https://api.stripe.com/v1/payment_methods/${paymentMethodId}`,
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
                stripe_payment_method_id: paymentMethodId,
                is_primary: isFirstCard,
              });
          }
        }
      }

      const redirectTo = getRedirectDestination(context);

      console.log('Payment confirmation complete');
      console.log('=== CONFIRM PAYMENT END ===');

      return new Response(
        JSON.stringify({
          success: true,
          redirectTo,
          data: resultData,
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

    if (req.method === 'POST' && path.includes('/charge-saved-method')) {
      const body = await req.json();
      const { paymentMethodId, context } = body;

      if (!paymentMethodId || !context) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const pricing = await calculatePricing(context, supabase);
      const amountInCents = Math.round(pricing.totalAmount * 100);

      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (!userData?.stripe_customer_id) {
        return new Response(
          JSON.stringify({ error: 'No Stripe customer found' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: paymentMethod, error: pmError } = await supabase
        .from('payment_methods')
        .select('stripe_payment_method_id, user_id')
        .eq('id', paymentMethodId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (pmError || !paymentMethod) {
        return new Response(
          JSON.stringify({ error: 'Payment method not found or does not belong to user' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!paymentMethod.stripe_payment_method_id) {
        return new Response(
          JSON.stringify({ error: 'Payment method not properly configured' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const stripePaymentMethodResponse = await fetch(
        `https://api.stripe.com/v1/payment_methods/${paymentMethod.stripe_payment_method_id}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!stripePaymentMethodResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Invalid payment method' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const stripePM = await stripePaymentMethodResponse.json();

      if (stripePM.customer !== userData.stripe_customer_id) {
        console.error(`Payment method customer mismatch. Expected: ${userData.stripe_customer_id}, Got: ${stripePM.customer}`);
        return new Response(
          JSON.stringify({ error: 'Payment method does not belong to this customer' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const paymentIntentParams: Record<string, string> = {
        amount: amountInCents.toString(),
        currency: 'eur',
        customer: userData.stripe_customer_id,
        payment_method: paymentMethod.stripe_payment_method_id,
        confirm: 'true',
        off_session: 'true',
        'metadata[type]': context.type,
        'metadata[user_id]': user.id,
      };

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
        console.error('Payment failed:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.error?.message || 'Payment failed',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const paymentIntent = await paymentIntentResponse.json();

      if (paymentIntent.status === 'succeeded') {
        const redirectTo = getRedirectDestination(context);

        return new Response(
          JSON.stringify({
            success: true,
            redirectTo,
            paymentIntentId: paymentIntent.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Payment requires additional action',
            status: paymentIntent.status,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unified payment error:', error);
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