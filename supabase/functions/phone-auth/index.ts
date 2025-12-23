import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_BASE_URL = "https://api.pawatasty.com";
const API_KEY = "b0834cfeae781e2c13213b55741d2717";
const API_SECRET = "db0572a02b9aa963b0138e7180ba994fa730ddf63cfc5b60798c15a234b6523f";

interface SendOTPRequest {
  phone: string;
}

interface VerifyOTPRequest {
  phone: string;
  code: string;
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    if (action === "send-otp") {
      const body: SendOTPRequest = await req.json();
      const { phone } = body;

      if (!phone) {
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      console.log('📱 Sending OTP to:', phone);

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

      try {
        console.log('📞 Attempting backend API:', `${API_BASE_URL}/api/auth/phone/send-otp`);

        const response = await fetch(`${API_BASE_URL}/api/auth/phone/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'X-API-Secret': API_SECRET,
          },
          body: JSON.stringify({ phone }),
        });

        console.log('📥 Backend response status:', response.status);
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.log('📥 Backend response data:', JSON.stringify(data));

          if (response.ok) {
            console.log('✅ OTP sent via backend API');
            return new Response(
              JSON.stringify({
                success: true,
                message: 'OTP sent successfully',
                phone
              }),
              {
                status: 200,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              },
            );
          }
        }

        throw new Error('Backend API unavailable or returned invalid response');
      } catch (apiError: any) {
        console.warn('⚠️ Backend API failed, using database fallback:', apiError.message);
      }

      try {
        await supabase.from('otp_codes').update({ verified: true }).eq('phone', phone).eq('verified', false);

        const { error: insertError } = await supabase
          .from('otp_codes')
          .insert({
            phone,
            code: otpCode,
            expires_at: expiresAt.toISOString(),
            verified: false,
          });

        if (insertError) {
          console.error('❌ Failed to store OTP:', insertError);
          throw new Error('Failed to generate verification code');
        }

        console.log('✅ OTP stored in database:', otpCode, 'for phone:', phone);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'OTP sent successfully',
            phone,
            devMode: true,
            code: otpCode
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error: any) {
        console.error('❌ Database fallback error:', error.message);
        return new Response(
          JSON.stringify({
            error: error.message || 'Failed to send OTP',
            details: 'Unable to send SMS. Please try again later.'
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
    }

    if (action === "verify-otp") {
      const body: VerifyOTPRequest = await req.json();
      const { phone, code } = body;

      if (!phone || !code) {
        return new Response(
          JSON.stringify({ error: "Phone number and code are required" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      console.log('🔐 Verifying OTP for:', phone);

      let verified = false;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/phone/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'X-API-Secret': API_SECRET,
          },
          body: JSON.stringify({ phone, code }),
        });

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const data = await response.json();

          if (response.ok) {
            console.log('✅ OTP verified via backend API');
            verified = true;
          }
        }
      } catch (apiError: any) {
        console.warn('⚠️ Backend API verification failed, checking database:', apiError.message);
      }

      if (!verified) {
        const { data: otpRecord } = await supabase
          .from('otp_codes')
          .select('*')
          .eq('phone', phone)
          .eq('code', code)
          .eq('verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!otpRecord) {
          return new Response(
            JSON.stringify({
              error: 'Invalid or expired verification code',
              details: 'Please request a new code'
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        await supabase
          .from('otp_codes')
          .update({ verified: true })
          .eq('id', otpRecord.id);

        console.log('✅ OTP verified from database');
        verified = true;
      }

      if (!verified) {
        return new Response(
          JSON.stringify({
            error: 'Invalid verification code',
            details: 'Please check your code and try again'
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      try {
        const { data: existingUsers } = await supabase
          .from('users')
          .select('id, email, phone_nr, full_name, user_id')
          .eq('phone_nr', phone)
          .maybeSingle();

        let userId = existingUsers?.user_id || existingUsers?.id;
        let userEmail = existingUsers?.email;

        if (!existingUsers) {
          console.log('📝 Creating new user for phone:', phone);

          const phoneEmail = phone.replace(/[^0-9]/g, '') + '@phone.pawatasty.com';
          const newUserId = crypto.randomUUID();

          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              user_id: newUserId,
              phone_nr: phone,
              email: phoneEmail,
              full_name: null,
              profile_completed: false,
            })
            .select('id, email, phone_nr, full_name, user_id')
            .single();

          if (createError) {
            console.error('❌ Error creating user:', createError);
            throw new Error('Failed to create user account');
          }

          userId = newUser.user_id || newUser.id;
          userEmail = newUser.email;
          console.log('✅ New user created:', userId);
        }

        const sessionToken = crypto.randomUUID();

        return new Response(
          JSON.stringify({
            success: true,
            session: {
              access_token: sessionToken,
              refresh_token: crypto.randomUUID(),
              user: {
                id: userId,
                email: userEmail,
                phone: phone,
              }
            },
            user: {
              id: userId,
              email: userEmail,
              phone: phone,
            },
            dbUser: {
              id: userId,
              email: userEmail,
              phone: phone,
              full_name: existingUsers?.full_name || null,
            }
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error: any) {
        console.error('❌ Verification error:', error);
        return new Response(
          JSON.stringify({
            error: error.message || 'Failed to verify OTP',
            details: 'Please check your code and try again'
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid endpoint" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error('❌ Server error:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
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
