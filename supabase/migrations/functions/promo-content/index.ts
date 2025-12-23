import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PromoContent {
  id: number;
  promo_title: string;
  content_type: 'text' | 'image';
  text_content: string | null;
  image_url: string | null;
  target_flex_users: boolean;
  target_subscription_users: boolean;
  is_active: boolean;
  display_nr: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's subscription type
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('subscription')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userDataError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userSubscriptionType = userData?.subscription || 'flex';
    const isFlexUser = userSubscriptionType === 'flex';
    const isSubscriptionUser = userSubscriptionType === 'silver' || userSubscriptionType === 'gold';

    // Fetch active promo content filtered by user's subscription type
    let query = supabase
      .from('promo_content')
      .select('*')
      .eq('is_active', true);

    // Filter by target group
    if (isFlexUser) {
      query = query.eq('target_flex_users', true);
    } else if (isSubscriptionUser) {
      query = query.eq('target_subscription_users', true);
    }

    const { data: promoContent, error: promoError } = await query.order('display_nr', { ascending: true });

    if (promoError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch promo content' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Filter by scheduled dates
    const now = new Date();
    const filteredPromos = (promoContent || []).filter((promo: PromoContent) => {
      // Check if promo is within scheduled time range
      if (promo.scheduled_start) {
        const startDate = new Date(promo.scheduled_start);
        if (now < startDate) return false;
      }

      if (promo.scheduled_end) {
        const endDate = new Date(promo.scheduled_end);
        if (now > endDate) return false;
      }

      return true;
    });

    console.log(`✅ Fetched ${filteredPromos.length} active promos for user ${user.id} (${userSubscriptionType})`);

    return new Response(
      JSON.stringify({
        success: true,
        promos: filteredPromos,
        userSubscriptionType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in promo-content function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});