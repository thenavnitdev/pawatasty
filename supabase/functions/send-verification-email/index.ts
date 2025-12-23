import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendVerificationRequest {
  userId?: string;
  email?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: SendVerificationRequest = await req.json();
    let targetUserId = body.userId;
    let targetEmail = body.email;

    // If no userId provided, get the latest user with an email
    if (!targetUserId && !targetEmail) {
      const { data: latestUser, error: userError } = await supabase
        .from('users')
        .select('user_id, email, full_name')
        .not('email', 'is', null)
        .neq('email', '')
        .not('email', 'like', '%@phone.pawatasty.com%')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (userError || !latestUser) {
        return new Response(
          JSON.stringify({ error: 'No user found with email' }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      targetUserId = latestUser.user_id;
      targetEmail = latestUser.email;
    }

    // If email provided but no userId, find the user
    if (!targetUserId && targetEmail) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', targetEmail)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'User not found with that email' }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      targetUserId = user.user_id;
    }

    // Get the email if we only have userId
    if (targetUserId && !targetEmail) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', targetUserId)
        .single();

      if (userError || !user || !user.email) {
        return new Response(
          JSON.stringify({ error: 'User has no email address' }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      targetEmail = user.email;
    }

    console.log(`📧 Sending verification email to: ${targetEmail} (User: ${targetUserId})`);

    // Get current auth user status
    const { data: authUserBefore } = await supabase.auth.admin.getUserById(targetUserId);

    console.log('Current status:', {
      email: authUserBefore?.user?.email,
      email_confirmed_at: authUserBefore?.user?.email_confirmed_at,
    });

    // First, unconfirm the email so we can resend verification
    const { error: unconfirmError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { email_confirm: false }
    );

    if (unconfirmError) {
      console.error('⚠️ Could not unconfirm email:', unconfirmError);
    }

    // Generate verification link - use 'signup' type for email verification
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: targetEmail,
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL")}/auth/callback`
      }
    });

    if (linkError) {
      console.error('❌ Error generating verification email:', linkError);

      return new Response(
        JSON.stringify({
          error: 'Failed to send verification email',
          details: linkError.message,
          note: 'Email confirmation might be disabled or email provider not configured'
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

    console.log('✅ Verification email link generated');
    console.log('Verification link:', linkData.properties?.action_link);

    // Get updated user status
    const { data: authUserAfter } = await supabase.auth.admin.getUserById(targetUserId);

    const response = {
      success: true,
      message: 'Verification email sent successfully',
      user: {
        id: targetUserId,
        email: targetEmail,
        email_confirmed_at: authUserAfter?.user?.email_confirmed_at,
      },
      verification_link: linkData?.properties?.action_link || null,
      email_sent: true,
      note: 'Verification email has been sent. User should check their inbox and spam folder.',
    };

    console.log('Response:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
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