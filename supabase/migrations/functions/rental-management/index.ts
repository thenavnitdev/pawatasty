import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StartRentalRequest {
  powerbankId: string;
  stationId: string;
  paymentMethodId?: string;
}

interface EndRentalRequest {
  rentalId: string;
  returnStationId: string;
}

const RENTAL_PRICING = {
  RATE_PER_30_MIN_CENTS: 100,
  DAILY_CAP_CENTS: 500,
  DAILY_CAP_HOURS: 24,
  LATE_PENALTY_DAYS: 5,
  LATE_PENALTY_AMOUNT_CENTS: 2500,
  POWERBANK_PURCHASE_PENALTY_CENTS: 2500,
};

function calculateRentalCharge(durationMinutes: number): {
  blocks: number;
  amountCents: number;
  amountEuros: number;
  cappedAtDaily: boolean;
} {
  const blocks = Math.ceil(durationMinutes / 30);
  let amountCents = blocks * RENTAL_PRICING.RATE_PER_30_MIN_CENTS;
  let cappedAtDaily = false;

  if (amountCents > RENTAL_PRICING.DAILY_CAP_CENTS) {
    amountCents = RENTAL_PRICING.DAILY_CAP_CENTS;
    cappedAtDaily = true;
  }

  return {
    blocks,
    amountCents,
    amountEuros: amountCents / 100,
    cappedAtDaily,
  };
}

function calculateLatePenalty(durationMinutes: number): {
  isLate: boolean;
  rentalDays: number;
  penaltyAmountCents: number;
  totalAmountCents: number;
  isPurchase: boolean;
} {
  const durationDays = durationMinutes / (60 * 24);

  if (durationDays <= RENTAL_PRICING.LATE_PENALTY_DAYS) {
    return {
      isLate: false,
      rentalDays: 0,
      penaltyAmountCents: 0,
      totalAmountCents: 0,
      isPurchase: false,
    };
  }

  return {
    isLate: true,
    rentalDays: RENTAL_PRICING.LATE_PENALTY_DAYS,
    penaltyAmountCents: RENTAL_PRICING.LATE_PENALTY_AMOUNT_CENTS + RENTAL_PRICING.POWERBANK_PURCHASE_PENALTY_CENTS,
    totalAmountCents: RENTAL_PRICING.LATE_PENALTY_AMOUNT_CENTS + RENTAL_PRICING.POWERBANK_PURCHASE_PENALTY_CENTS,
    isPurchase: true,
  };
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
      return new Response(
        JSON.stringify({ error: 'Payment processing not configured' }),
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

    if (req.method === 'POST' && path.includes('/start')) {
      const body: StartRentalRequest = await req.json();

      const { data: userData } = await supabase
        .from('users')
        .select('subscription, stripe_customer_id')
        .eq('id', user.id)
        .single();

      let stripeCustomerId = userData?.stripe_customer_id;
      let stripePaymentMethodId = null;

      if (body.paymentMethodId) {
        const { data: providedMethod } = await supabase
          .from('payment_methods')
          .select('stripe_payment_method_id, user_id')
          .eq('stripe_payment_method_id', body.paymentMethodId)
          .eq('user_id', user.id)
          .eq('payment_method_status', 'active')
          .maybeSingle();

        if (!providedMethod) {
          return new Response(
            JSON.stringify({
              error: 'Payment method not found or does not belong to user',
              code: 'INVALID_PAYMENT_METHOD'
            }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        stripePaymentMethodId = providedMethod.stripe_payment_method_id;
      }

      if (!stripePaymentMethodId) {
        const { data: primaryMethod } = await supabase
          .from('payment_methods')
          .select('stripe_payment_method_id')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .eq('payment_method_status', 'active')
          .single();

        if (!primaryMethod?.stripe_payment_method_id) {
          return new Response(
            JSON.stringify({
              error: 'No payment method found. Please add a payment method first.',
              code: 'NO_PAYMENT_METHOD'
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        stripePaymentMethodId = primaryMethod.stripe_payment_method_id;
      }

      if (!stripeCustomerId) {
        const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: user.email || '',
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

      const validationAmount = 100;

      const piResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: validationAmount.toString(),
          currency: 'eur',
          customer: stripeCustomerId,
          payment_method: stripePaymentMethodId,
          confirm: 'true',
          off_session: 'true',
          'metadata[type]': 'flex_rental_validation',
          'metadata[user_id]': user.id,
          'metadata[powerbank_id]': body.powerbankId,
          'metadata[station_id]': body.stationId,
          description: `Powerbank rental - €1.00 (first 30 minutes) - Station ${body.stationId}`,
        }),
      });

      if (!piResponse.ok) {
        const error = await piResponse.json();
        return new Response(
          JSON.stringify({
            error: error.error?.message || 'Validation charge failed',
            code: 'VALIDATION_CHARGE_FAILED'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const paymentIntent = await piResponse.json();

      if (paymentIntent.status !== 'succeeded') {
        return new Response(
          JSON.stringify({
            error: 'Validation payment not completed',
            status: paymentIntent.status,
            code: 'PAYMENT_NOT_COMPLETED'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const validationChargeId = paymentIntent.id;

      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          powerbank_id: body.powerbankId,
          station_start_id: body.stationId,
          start_time: new Date().toISOString(),
          status: 'active',
          stripe_customer_id: stripeCustomerId,
          stripe_payment_method_id: stripePaymentMethodId,
          validation_charge_id: validationChargeId,
          validation_paid: true,
        })
        .select()
        .single();

      if (rentalError) {
        throw rentalError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          rental: {
            id: rental.id,
            rentalId: rental.id,
            powerbankId: rental.powerbank_id,
            stationId: rental.station_start_id,
            startTime: rental.start_time,
            validationFeeCharged: true,
            validationAmount: 1.00,
            includedMinutes: 30,
            pricing: {
              ratePerHalfHour: '€1.00',
              dailyCap: '€5.00',
              dailyCapHours: 24,
              latePenaltyDays: 5,
              latePenaltyAmount: '€50.00 (€25 rental + €25 purchase penalty)',
            },
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST' && path.includes('/end')) {
      const body: EndRentalRequest = await req.json();

      const { data: rental } = await supabase
        .from('rentals')
        .select('*')
        .eq('id', body.rentalId)
        .eq('user_id', user.id)
        .single();

      if (!rental) {
        return new Response(
          JSON.stringify({ error: 'Rental not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (rental.status !== 'active') {
        return new Response(
          JSON.stringify({ error: 'Rental is not active' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const endTime = new Date();
      const startTime = new Date(rental.start_time);
      const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const latePenalty = calculateLatePenalty(durationMinutes);

      let totalAmountCents = 0;
      let usageChargeId = null;
      let description = '';

      if (latePenalty.isLate) {
        totalAmountCents = latePenalty.totalAmountCents;
        description = latePenalty.isPurchase
          ? `Powerbank not returned within ${RENTAL_PRICING.LATE_PENALTY_DAYS} days - Purchase penalty: €25.00 rental + €25.00 penalty = €50.00`
          : `Late return penalty: ${latePenalty.rentalDays} days overdue`;
      } else {
        const charge = calculateRentalCharge(durationMinutes);
        totalAmountCents = charge.amountCents;
        description = charge.cappedAtDaily
          ? `Powerbank rental - ${durationMinutes} minutes (${charge.blocks} blocks) - Daily cap applied: €5.00`
          : `Powerbank rental - ${durationMinutes} minutes (${charge.blocks} blocks) @ €1.00 per 30 min`;
      }

      const alreadyPaidCents = 100;
      const additionalChargeCents = Math.max(0, totalAmountCents - alreadyPaidCents);

      if (additionalChargeCents > 0 && rental.stripe_payment_method_id) {
        const piResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: additionalChargeCents.toString(),
            currency: 'eur',
            customer: rental.stripe_customer_id,
            payment_method: rental.stripe_payment_method_id,
            confirm: 'true',
            off_session: 'true',
            'metadata[type]': latePenalty.isLate ? 'flex_rental_penalty' : 'flex_rental_usage',
            'metadata[user_id]': user.id,
            'metadata[rental_id]': body.rentalId.toString(),
            'metadata[duration_minutes]': durationMinutes.toString(),
            'metadata[is_late_penalty]': latePenalty.isLate.toString(),
            'metadata[is_purchase]': latePenalty.isPurchase.toString(),
            description,
          }),
        });

        if (piResponse.ok) {
          const paymentIntent = await piResponse.json();
          if (paymentIntent.status === 'succeeded') {
            usageChargeId = paymentIntent.id;
          }
        }
      }

      const finalTotalEuros = totalAmountCents / 100;
      const additionalChargeEuros = additionalChargeCents / 100;

      await supabase
        .from('rentals')
        .update({
          station_end_id: body.returnStationId,
          end_time: endTime.toISOString(),
          total_minutes: durationMinutes,
          usage_amount: finalTotalEuros,
          usage_charge_id: usageChargeId,
          status: latePenalty.isPurchase ? 'purchased' : 'completed',
          updated_at: endTime.toISOString(),
        })
        .eq('id', body.rentalId);

      return new Response(
        JSON.stringify({
          success: true,
          rental: {
            id: rental.id,
            rentalId: rental.id,
            durationMinutes,
            validationFeePaid: 1.00,
            additionalCharge: additionalChargeEuros,
            totalCharge: finalTotalEuros,
            isLatePenalty: latePenalty.isLate,
            isPurchase: latePenalty.isPurchase,
            breakdown: latePenalty.isLate ? {
              rentalDays: latePenalty.rentalDays,
              rentalFee: 25.00,
              purchasePenalty: 25.00,
              total: 50.00,
              note: 'Powerbank not returned within 5 days - considered purchased',
            } : {
              blocks: Math.ceil(durationMinutes / 30),
              ratePerBlock: 1.00,
              cappedAtDaily: totalAmountCents >= RENTAL_PRICING.DAILY_CAP_CENTS,
              dailyCap: 5.00,
            },
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET' && path.includes('/active')) {
      const { data: activeRentals } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('start_time', { ascending: false });

      return new Response(
        JSON.stringify({
          rentals: activeRentals || [],
          hasActiveRental: (activeRentals?.length || 0) > 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      const { data: rentals } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ rentals: rentals || [] }),
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
    console.error('Rental management error:', error);
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