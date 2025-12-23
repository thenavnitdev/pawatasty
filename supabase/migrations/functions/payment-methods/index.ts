import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentMethodRequest {
  type: 'card' | 'ideal' | 'applepay' | 'googlepay' | 'bancontact' | 'sepa_debit' | 'revolut_pay';
  cardNumber?: string;
  cardholderName?: string;
  expiryDate?: string;
  cvv?: string;
  email?: string;
  iban?: string;
  isPrimary?: boolean;
  stripePaymentMethodId?: string;
  bankName?: string;
}

interface PaymentMethodCapabilities {
  supportsSubscriptions: boolean;
  supportsOffSession: boolean;
  supportsOneTime: boolean;
}

function getPaymentMethodCapabilities(type: string): PaymentMethodCapabilities {
  switch (type) {
    case 'card':
      return {
        supportsSubscriptions: true,
        supportsOffSession: true,
        supportsOneTime: true,
      };
    case 'sepa_debit':
      return {
        supportsSubscriptions: true,
        supportsOffSession: true,
        supportsOneTime: false,
      };
    case 'ideal':
      return {
        supportsSubscriptions: true,
        supportsOffSession: true,
        supportsOneTime: true,
      };
    case 'bancontact':
      return {
        supportsSubscriptions: true,
        supportsOffSession: true,
        supportsOneTime: true,
      };
    case 'applepay':
    case 'googlepay':
      return {
        supportsSubscriptions: true,
        supportsOffSession: true,
        supportsOneTime: true,
      };
    case 'revolut_pay':
      return {
        supportsSubscriptions: true,
        supportsOffSession: true,
        supportsOneTime: true,
      };
    default:
      return {
        supportsSubscriptions: false,
        supportsOffSession: false,
        supportsOneTime: true,
      };
  }
}

async function attachPaymentMethodToCustomer(
  stripeSecretKey: string,
  paymentMethodId: string,
  customerId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/payment_methods/${paymentMethodId}/attach`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: customerId,
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error attaching payment method:', error);
    return false;
  }
}

async function createSetupIntent(
  stripeSecretKey: string,
  customerId: string,
  paymentMethodType: string,
  customerName?: string,
  customerEmail?: string
): Promise<{ setupIntent?: any; error?: string }> {
  try {
    const params = new URLSearchParams({
      customer: customerId,
      'payment_method_types[]': paymentMethodType,
      'usage': 'off_session',
    });

    const response = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error?.message || 'Failed to create setup intent' };
    }

    const setupIntent = await response.json();
    return { setupIntent };
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return { error: error.message || 'Failed to create setup intent' };
  }
}

async function validateStripePaymentMethod(
  stripeSecretKey: string,
  paymentMethodId: string
): Promise<{ valid: boolean; paymentMethod?: any; error?: string }> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/payment_methods/${paymentMethodId}`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!response.ok) {
      return { valid: false, error: 'Invalid payment method' };
    }

    const paymentMethod = await response.json();
    return { valid: true, paymentMethod };
  } catch (error) {
    console.error('Error validating payment method:', error);
    return { valid: false, error: error.message };
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
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET') {
      const { data: paymentMethods, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_method_status', 'active')
        .order('is_primary', { ascending: false });

      if (error) throw error;

      const formattedMethods = (paymentMethods || []).map((pm: any) => ({
        id: pm.id,
        userId: pm.user_id,
        type: pm.type,
        lastFour: pm.last_four,
        cardholderName: pm.cardholder_name,
        email: pm.email,
        isPrimary: pm.is_primary,
        cardBrand: pm.card_brand,
        expiryMonth: pm.expiry_month,
        expiryYear: pm.expiry_year,
        stripePaymentMethodId: pm.stripe_payment_method_id,
        createdAt: pm.created_at,
        status: pm.payment_method_status,
        supportsSubscriptions: pm.supports_subscriptions,
        supportsOffSession: pm.supports_off_session,
        supportsOneTime: pm.supports_one_time,
      }));

      return new Response(
        JSON.stringify({ paymentMethods: formattedMethods }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'PUT' && pathParts.includes('complete')) {
      const paymentMethodId = pathParts[pathParts.indexOf('payment-methods') + 1];
      const body = await req.json();
      const { setupIntentId } = body;

      if (!setupIntentId) {
        return new Response(
          JSON.stringify({ error: 'Setup Intent ID is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Payment processing not configured' }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const setupIntentResponse = await fetch(
        `https://api.stripe.com/v1/setup_intents/${setupIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!setupIntentResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve setup intent' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const setupIntent = await setupIntentResponse.json();

      if (setupIntent.status !== 'succeeded') {
        return new Response(
          JSON.stringify({ error: `Setup not complete. Status: ${setupIntent.status}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: paymentMethod, error: pmError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', paymentMethodId)
        .eq('user_id', user.id)
        .single();

      if (pmError || !paymentMethod) {
        return new Response(
          JSON.stringify({ error: 'Payment method not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({
          stripe_payment_method_id: setupIntent.payment_method,
          payment_method_status: 'active',
          setup_completed_at: new Date().toISOString(),
        })
        .eq('id', paymentMethodId);

      if (updateError) throw updateError;

      if (paymentMethod.is_primary) {
        await supabase
          .from('payment_methods')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', paymentMethodId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment method setup completed',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const body: PaymentMethodRequest = await req.json();

      if (!body.type) {
        return new Response(
          JSON.stringify({ error: 'Payment method type is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Payment processing not configured' }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: userData } = await supabase
        .from('users')
        .select('email, stripe_customer_id, full_name')
        .eq('id', user.id)
        .single();

      let customerId = userData?.stripe_customer_id;

      if (!customerId) {
        const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: userData?.email || '',
            'metadata[user_id]': user.id,
          }),
        });

        if (customerResponse.ok) {
          const customer = await customerResponse.json();
          customerId = customer.id;

          await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', user.id);
        } else {
          return new Response(
            JSON.stringify({ error: 'Failed to create customer' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      let lastFour = '';
      let cardBrand = 'card';
      let expiryMonth: number | null = null;
      let expiryYear: number | null = null;
      let cardholderName: string | null = null;
      let stripePaymentMethodId: string | null = null;
      let stripeSetupIntentId: string | null = null;
      let paymentMethodStatus = 'pending';
      let setupCompletedAt: string | null = null;
      const capabilities = getPaymentMethodCapabilities(body.type);

      if (body.type === 'card') {
        if (!body.stripePaymentMethodId) {
          return new Response(
            JSON.stringify({
              error: 'Stripe Payment Method ID is required for card payments. Please use Stripe Elements to create payment method first.'
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const validation = await validateStripePaymentMethod(stripeSecretKey, body.stripePaymentMethodId);
        if (!validation.valid || !validation.paymentMethod) {
          return new Response(
            JSON.stringify({ error: validation.error || 'Invalid payment method' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const pm = validation.paymentMethod;
        lastFour = pm.card.last4;
        cardBrand = pm.card.brand;
        expiryMonth = pm.card.exp_month;
        expiryYear = pm.card.exp_year;
        cardholderName = pm.billing_details?.name || null;
        stripePaymentMethodId = body.stripePaymentMethodId;

        const attached = await attachPaymentMethodToCustomer(stripeSecretKey, stripePaymentMethodId, customerId);
        if (!attached) {
          return new Response(
            JSON.stringify({ error: 'Failed to attach payment method to customer' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        paymentMethodStatus = 'active';
        setupCompletedAt = new Date().toISOString();

      } else if (body.type === 'ideal' || body.type === 'bancontact') {
        if (!body.cardholderName) {
          return new Response(
            JSON.stringify({ error: `Cardholder name is required for ${body.type}` }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        console.log(`Creating SetupIntent for ${body.type}`);

        const setupIntentResponse = await fetch('https://api.stripe.com/v1/setup_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            customer: customerId,
            'payment_method_types[]': body.type,
            usage: 'off_session',
          }),
        });

        if (!setupIntentResponse.ok) {
          const error = await setupIntentResponse.json();
          return new Response(
            JSON.stringify({ error: error.error?.message || `Failed to create ${body.type} setup intent` }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const setupIntent = await setupIntentResponse.json();
        console.log(`SetupIntent created: ${setupIntent.id} with status: ${setupIntent.status}`);

        stripeSetupIntentId = setupIntent.id;
        lastFour = body.type.toUpperCase();
        cardBrand = body.type;
        cardholderName = body.cardholderName.trim();
        paymentMethodStatus = 'pending';

        const insertData: any = {
          user_id: user.id,
          type: body.type,
          is_primary: body.isPrimary || false,
          last_four: lastFour,
          card_brand: cardBrand,
          cardholder_name: cardholderName,
          stripe_setup_intent_id: stripeSetupIntentId,
          payment_method_status: paymentMethodStatus,
          supports_subscriptions: capabilities.supportsSubscriptions,
          supports_off_session: capabilities.supportsOffSession,
          supports_one_time: capabilities.supportsOneTime,
        };

        const { data: newMethod, error: insertError } = await supabase
          .from('payment_methods')
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({
            id: newMethod.id,
            requiresAction: true,
            clientSecret: setupIntent.client_secret,
            setupIntentId: setupIntent.id,
            paymentMethodId: newMethod.id.toString(),
            type: body.type,
          }),
          {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      } else if (body.type === 'sepa_debit') {
        if (!body.iban || !body.cardholderName) {
          return new Response(
            JSON.stringify({ error: 'IBAN and cardholder name are required for SEPA' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const sepaResponse = await fetch('https://api.stripe.com/v1/payment_methods', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'type': 'sepa_debit',
            'sepa_debit[iban]': body.iban.replace(/\s/g, ''),
            'billing_details[name]': body.cardholderName.trim(),
            'billing_details[email]': userData?.email || body.email || '',
          }),
        });

        if (!sepaResponse.ok) {
          const error = await sepaResponse.json();
          return new Response(
            JSON.stringify({ error: error.error?.message || 'Failed to create SEPA payment method' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const sepaPaymentMethod = await sepaResponse.json();
        stripePaymentMethodId = sepaPaymentMethod.id;
        lastFour = body.iban.slice(-4);
        cardBrand = 'sepa_debit';
        cardholderName = body.cardholderName.trim();

        const attached = await attachPaymentMethodToCustomer(stripeSecretKey, stripePaymentMethodId, customerId);
        if (!attached) {
          return new Response(
            JSON.stringify({ error: 'Failed to attach SEPA payment method to customer' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        paymentMethodStatus = 'active';
        setupCompletedAt = new Date().toISOString();
      } else if (body.type === 'applepay' || body.type === 'googlepay') {
        if (!body.stripePaymentMethodId) {
          return new Response(
            JSON.stringify({ error: `Stripe Payment Method ID is required for ${body.type}` }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const validation = await validateStripePaymentMethod(stripeSecretKey, body.stripePaymentMethodId);
        if (!validation.valid || !validation.paymentMethod) {
          return new Response(
            JSON.stringify({ error: validation.error || 'Invalid payment method' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const pm = validation.paymentMethod;
        lastFour = pm.card.last4;
        cardBrand = pm.card.brand;
        stripePaymentMethodId = body.stripePaymentMethodId;

        const attached = await attachPaymentMethodToCustomer(stripeSecretKey, stripePaymentMethodId, customerId);
        if (!attached) {
          return new Response(
            JSON.stringify({ error: `Failed to attach ${body.type} to customer` }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        paymentMethodStatus = 'active';
        setupCompletedAt = new Date().toISOString();
      }

      const { data: existingCards } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_method_status', 'active');

      const isFirstCard = !existingCards || existingCards.length === 0;
      const shouldBePrimary = body.isPrimary || isFirstCard;

      if (shouldBePrimary) {
        await supabase
          .from('payment_methods')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const insertData: any = {
        user_id: user.id,
        type: body.type,
        is_primary: shouldBePrimary,
        last_four: lastFour,
        card_brand: cardBrand,
        stripe_payment_method_id: stripePaymentMethodId,
        stripe_setup_intent_id: stripeSetupIntentId,
        payment_method_status: paymentMethodStatus,
        setup_completed_at: setupCompletedAt,
        supports_subscriptions: capabilities.supportsSubscriptions,
        supports_off_session: capabilities.supportsOffSession,
        supports_one_time: capabilities.supportsOneTime,
      };

      if (body.type === 'card') {
        insertData.cardholder_name = cardholderName;
        insertData.expiry_month = expiryMonth;
        insertData.expiry_year = expiryYear;
      } else if (body.email) {
        insertData.email = body.email;
      } else if (cardholderName) {
        insertData.cardholder_name = cardholderName;
      }

      const { data: newMethod, error: insertError } = await supabase
        .from('payment_methods')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      let validationCharge = null;
      if ((body.type === 'card' || body.type === 'sepa_debit') && stripePaymentMethodId) {
        try {
          const piResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: '1',
              currency: 'eur',
              customer: customerId,
              payment_method: stripePaymentMethodId,
              confirm: 'true',
              off_session: 'false',
              setup_future_usage: 'off_session',
              description: 'Payment method validation charge (€0.01)',
              'metadata[type]': 'payment_method_validation',
              'metadata[user_id]': user.id,
              'metadata[payment_method_id]': newMethod.id.toString(),
            }),
          });

          if (piResponse.ok) {
            validationCharge = await piResponse.json();
            console.log('✅ Validation charge created:', validationCharge.id, validationCharge.status);
          } else {
            const error = await piResponse.json();
            console.error('❌ Validation charge failed:', error);
            
            await supabase
              .from('payment_methods')
              .delete()
              .eq('id', newMethod.id);

            return new Response(
              JSON.stringify({ 
                error: `Failed to validate payment method: ${error.error?.message || 'Payment method could not be verified'}` 
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } catch (err) {
          console.error('Validation charge error:', err);
          
          await supabase
            .from('payment_methods')
            .delete()
            .eq('id', newMethod.id);

          return new Response(
            JSON.stringify({ error: 'Failed to validate payment method. Please try again.' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({
          id: newMethod.id,
          userId: newMethod.user_id,
          type: newMethod.type,
          lastFour: newMethod.last_four,
          cardholderName: newMethod.cardholder_name,
          email: newMethod.email,
          isPrimary: newMethod.is_primary,
          cardBrand: newMethod.card_brand,
          expiryMonth: newMethod.expiry_month,
          expiryYear: newMethod.expiry_year,
          stripePaymentMethodId: newMethod.stripe_payment_method_id,
          stripeSetupIntentId: newMethod.stripe_setup_intent_id,
          status: newMethod.payment_method_status,
          setupCompletedAt: newMethod.setup_completed_at,
          supportsSubscriptions: newMethod.supports_subscriptions,
          supportsOffSession: newMethod.supports_off_session,
          supportsOneTime: newMethod.supports_one_time,
          createdAt: newMethod.created_at,
          validationCharge: validationCharge ? {
            id: validationCharge.id,
            amount: validationCharge.amount,
            status: validationCharge.status,
          } : null,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'DELETE') {
      const paymentMethodId = pathParts[pathParts.indexOf('payment-methods') + 1];

      if (!paymentMethodId) {
        return new Response(
          JSON.stringify({ error: 'Payment method ID is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from('payment_methods')
        .update({ payment_method_status: 'inactive' })
        .eq('id', paymentMethodId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: 'Payment method deleted' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'PUT' && pathParts.includes('default')) {
      const paymentMethodId = pathParts[pathParts.indexOf('payment-methods') + 1];

      if (!paymentMethodId) {
        return new Response(
          JSON.stringify({ error: 'Payment method ID is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await supabase
        .from('payment_methods')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({ is_primary: true })
        .eq('id', paymentMethodId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Default payment method updated' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});