import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const signingSecret = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      signingSecret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureParts = signature.split(',');
    const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1];
    const expectedSig = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !expectedSig) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const signedData = encoder.encode(signedPayload);

    const expectedSigBytes = new Uint8Array(
      expectedSig.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      expectedSigBytes,
      signedData
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripeSignature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const payload = await req.text();

    if (webhookSecret && stripeSignature) {
      const isValid = await verifyStripeSignature(
        payload,
        stripeSignature,
        webhookSecret
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const event = JSON.parse(payload);
    console.log('Received Stripe webhook event:', event.type);

    if (event.type === 'setup_intent.succeeded') {
      const setupIntent = event.data.object;
      console.log('Setup Intent succeeded:', setupIntent.id);

      const { data: paymentMethod, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('stripe_setup_intent_id', setupIntent.id)
        .single();

      if (error || !paymentMethod) {
        console.error('Payment method not found for setup intent:', setupIntent.id, error);
        return new Response(
          JSON.stringify({ received: true, note: 'Payment method not found' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const stripePaymentMethodId = setupIntent.payment_method;

      if (!stripePaymentMethodId) {
        console.error('No payment method ID in setup intent');
        return new Response(
          JSON.stringify({ received: true, note: 'No payment method in setup intent' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({
          stripe_payment_method_id: stripePaymentMethodId,
          payment_method_status: 'active',
          setup_completed_at: new Date().toISOString(),
        })
        .eq('id', paymentMethod.id);

      if (updateError) {
        console.error('Error updating payment method:', updateError);
        throw updateError;
      }

      console.log('✅ Payment method activated:', paymentMethod.id, stripePaymentMethodId);

      return new Response(
        JSON.stringify({ received: true, paymentMethodActivated: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (event.type === 'setup_intent.setup_failed') {
      const setupIntent = event.data.object;
      console.log('Setup Intent failed:', setupIntent.id);

      const { error } = await supabase
        .from('payment_methods')
        .update({
          payment_method_status: 'failed',
        })
        .eq('stripe_setup_intent_id', setupIntent.id);

      if (error) {
        console.error('Error marking payment method as failed:', error);
      }

      return new Response(
        JSON.stringify({ received: true, paymentMethodFailed: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('Payment Intent succeeded:', paymentIntent.id);

      if (paymentIntent.metadata?.type === 'payment_request_setup') {
        const { data: paymentMethod, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (error || !paymentMethod) {
          console.error('Payment method not found for payment intent:', paymentIntent.id, error);
          return new Response(
            JSON.stringify({ received: true, note: 'Payment method not found' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripePaymentMethodId = paymentIntent.payment_method;

        if (!stripePaymentMethodId) {
          console.error('No payment method ID in payment intent');
          return new Response(
            JSON.stringify({ received: true, note: 'No payment method in payment intent' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
          console.error('Stripe secret key not configured');
          return new Response(
            JSON.stringify({ received: true, note: 'Stripe not configured' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const pmResponse = await fetch(
          `https://api.stripe.com/v1/payment_methods/${stripePaymentMethodId}`,
          {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          }
        );

        if (!pmResponse.ok) {
          console.error('Failed to fetch payment method from Stripe');
          return new Response(
            JSON.stringify({ received: true, note: 'Failed to fetch payment method' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const pm = await pmResponse.json();

        const updateData: any = {
          stripe_payment_method_id: stripePaymentMethodId,
          payment_method_status: 'active',
          setup_completed_at: new Date().toISOString(),
        };

        if (pm.card) {
          updateData.last_four = pm.card.last4;
          updateData.card_brand = pm.card.brand;
          updateData.expiry_month = pm.card.exp_month;
          updateData.expiry_year = pm.card.exp_year;
        }

        const { error: updateError } = await supabase
          .from('payment_methods')
          .update(updateData)
          .eq('id', paymentMethod.id);

        if (updateError) {
          console.error('Error updating payment method:', updateError);
          throw updateError;
        }

        console.log('✅ Payment request method activated:', paymentMethod.id, stripePaymentMethodId);

        return new Response(
          JSON.stringify({ received: true, paymentMethodActivated: true, paymentRequestReady: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (paymentIntent.metadata?.type === 'card_setup') {
        const { data: paymentMethod, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (error || !paymentMethod) {
          console.error('Payment method not found for payment intent:', paymentIntent.id, error);
          return new Response(
            JSON.stringify({ received: true, note: 'Payment method not found' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripePaymentMethodId = paymentIntent.payment_method;

        if (!stripePaymentMethodId) {
          console.error('No payment method ID in payment intent');
          return new Response(
            JSON.stringify({ received: true, note: 'No payment method in payment intent' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
          console.error('Stripe secret key not configured');
          return new Response(
            JSON.stringify({ received: true, note: 'Stripe not configured' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const pmResponse = await fetch(
          `https://api.stripe.com/v1/payment_methods/${stripePaymentMethodId}`,
          {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          }
        );

        if (!pmResponse.ok) {
          console.error('Failed to fetch payment method from Stripe');
          return new Response(
            JSON.stringify({ received: true, note: 'Failed to fetch payment method' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const pm = await pmResponse.json();

        const updateData: any = {
          stripe_payment_method_id: stripePaymentMethodId,
          payment_method_status: 'active',
          setup_completed_at: new Date().toISOString(),
        };

        if (pm.card) {
          updateData.last_four = pm.card.last4;
          updateData.card_brand = pm.card.brand;
          updateData.expiry_month = pm.card.exp_month;
          updateData.expiry_year = pm.card.exp_year;
        }

        const { error: updateError } = await supabase
          .from('payment_methods')
          .update(updateData)
          .eq('id', paymentMethod.id);

        if (updateError) {
          console.error('Error updating payment method:', updateError);
          throw updateError;
        }

        console.log('✅ Card payment method activated:', paymentMethod.id, stripePaymentMethodId);

        return new Response(
          JSON.stringify({ received: true, paymentMethodActivated: true, cardReady: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (paymentIntent.metadata?.type === 'revolut_pay_setup') {
        const { data: paymentMethod, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (error || !paymentMethod) {
          console.error('Payment method not found for payment intent:', paymentIntent.id, error);
          return new Response(
            JSON.stringify({ received: true, note: 'Payment method not found' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripePaymentMethodId = paymentIntent.payment_method;

        if (!stripePaymentMethodId) {
          console.error('No payment method ID in payment intent');
          return new Response(
            JSON.stringify({ received: true, note: 'No payment method in payment intent' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const { error: updateError } = await supabase
          .from('payment_methods')
          .update({
            stripe_payment_method_id: stripePaymentMethodId,
            payment_method_status: 'active',
            setup_completed_at: new Date().toISOString(),
          })
          .eq('id', paymentMethod.id);

        if (updateError) {
          console.error('Error updating payment method:', updateError);
          throw updateError;
        }

        console.log('✅ Revolut Pay payment method activated:', paymentMethod.id, stripePaymentMethodId);

        return new Response(
          JSON.stringify({ received: true, paymentMethodActivated: true, revolutPayReady: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (paymentIntent.metadata?.type === 'bancontact_sepa_setup') {
        const { data: paymentMethod, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (error || !paymentMethod) {
          console.error('Payment method not found for payment intent:', paymentIntent.id, error);
          return new Response(
            JSON.stringify({ received: true, note: 'Payment method not found' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripePaymentMethodId = paymentIntent.payment_method;

        if (!stripePaymentMethodId) {
          console.error('No payment method ID in payment intent');
          return new Response(
            JSON.stringify({ received: true, note: 'No payment method in payment intent' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
          const pmResponse = await fetch(
            `https://api.stripe.com/v1/payment_methods/${stripePaymentMethodId}`,
            {
              headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
              },
            }
          );

          if (pmResponse.ok) {
            const pm = await pmResponse.json();
            const updateData: any = {
              stripe_payment_method_id: stripePaymentMethodId,
              payment_method_status: 'active',
              setup_completed_at: new Date().toISOString(),
            };

            if (pm.type === 'sepa_debit') {
              updateData.type = 'sepa_debit';
              updateData.card_brand = 'sepa_debit';
              updateData.last_four = pm.sepa_debit?.last4 || paymentMethod.last_four;
              console.log('✅ Bancontact payment converted to SEPA mandate');
            }

            const { error: updateError } = await supabase
              .from('payment_methods')
              .update(updateData)
              .eq('id', paymentMethod.id);

            if (updateError) {
              console.error('Error updating payment method:', updateError);
              throw updateError;
            }

            console.log('✅ Payment method activated:', paymentMethod.id, stripePaymentMethodId);

            return new Response(
              JSON.stringify({ received: true, paymentMethodActivated: true, convertedToSepa: pm.type === 'sepa_debit' }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }

        const { error: updateError } = await supabase
          .from('payment_methods')
          .update({
            stripe_payment_method_id: stripePaymentMethodId,
            payment_method_status: 'active',
            setup_completed_at: new Date().toISOString(),
          })
          .eq('id', paymentMethod.id);

        if (updateError) {
          console.error('Error updating payment method:', updateError);
          throw updateError;
        }

        console.log('✅ Payment method activated:', paymentMethod.id, stripePaymentMethodId);

        return new Response(
          JSON.stringify({ received: true, paymentMethodActivated: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log('Payment Intent failed:', paymentIntent.id);

      if (paymentIntent.metadata?.type === 'payment_request_setup' || paymentIntent.metadata?.type === 'card_setup' || paymentIntent.metadata?.type === 'revolut_pay_setup' || paymentIntent.metadata?.type === 'bancontact_sepa_setup') {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            payment_method_status: 'failed',
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (error) {
          console.error('Error marking payment method as failed:', error);
        }

        return new Response(
          JSON.stringify({ received: true, paymentMethodFailed: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log(`Unhandled event type: ${event.type}`);
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
