import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const countryMappings = [
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
  { code: 'IS', name: 'Iceland', dialCode: '+354' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
  { code: 'MC', name: 'Monaco', dialCode: '+377' },
  { code: 'SM', name: 'San Marino', dialCode: '+378' },
  { code: 'VA', name: 'Vatican City', dialCode: '+379' },
  { code: 'AD', name: 'Andorra', dialCode: '+376' },
];

function detectCountryFromPhone(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  const cleanedNumber = phoneNumber.replace(/[\s()-]/g, '');

  if (!cleanedNumber.startsWith('+')) {
    return null;
  }

  const sortedMappings = [...countryMappings].sort((a, b) =>
    b.dialCode.length - a.dialCode.length
  );

  for (const mapping of sortedMappings) {
    if (cleanedNumber.startsWith(mapping.dialCode)) {
      return mapping.name;
    }
  }

  return null;
}

function validatePhoneNumberE164(phoneNumber: string): { isValid: boolean; error?: string; formatted?: string } {
  if (!phoneNumber) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = phoneNumber.replace(/[\s\-()]/g, '');

  if (!cleaned.startsWith('+')) {
    return { isValid: false, error: 'Phone number must start with + followed by country code' };
  }

  if (!/^\+\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Phone number must contain only digits after the + sign' };
  }

  if (cleaned.length < 8) {
    return { isValid: false, error: 'Phone number is too short' };
  }

  if (cleaned.length > 16) {
    return { isValid: false, error: 'Phone number is too long (maximum 15 digits including country code)' };
  }

  return { isValid: true, formatted: cleaned };
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && pathParts.length === 1) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from("users")
          .insert({
            user_id: user.id,
            email: user.email,
            profile_completed: false,
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(
          JSON.stringify({
            id: user.id,
            email: user.email,
            firstName: newProfile.first_name,
            lastName: newProfile.last_name,
            phoneNumber: newProfile.phone_nr,
            dateOfBirth: newProfile.age,
            gender: newProfile.gender,
            address: "",
            city: "",
            postalCode: "",
            country: newProfile.country,
            membershipLevel: newProfile.profile_level,
            profileCompleted: newProfile.profile_completed,
            totalSavings: parseFloat(newProfile.total_savings || '0'),
            linkId: newProfile.link_id,
            createdAt: newProfile.created_at,
            updatedAt: newProfile.updated_at,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      let firstName = profile.first_name;
      let lastName = profile.last_name;

      if (!firstName && !lastName && profile.full_name) {
        const nameParts = profile.full_name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      return new Response(
        JSON.stringify({
          id: user.id,
          email: user.email || profile.email,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: profile.phone_nr,
          dateOfBirth: profile.age,
          gender: profile.gender,
          address: "",
          city: "",
          postalCode: "",
          country: profile.country,
          membershipLevel: profile.profile_level,
          profileCompleted: profile.profile_completed,
          totalSavings: parseFloat(profile.total_savings || '0'),
          linkId: profile.link_id,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "PUT" && pathParts.length === 1) {
      const body: UpdateProfileRequest = await req.json();

      const updateData: any = {};
      if (body.firstName !== undefined) updateData.first_name = body.firstName;
      if (body.lastName !== undefined) updateData.last_name = body.lastName;
      if (body.email !== undefined) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return new Response(
            JSON.stringify({ error: 'Invalid email address format' }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }
        updateData.email = body.email;
      }
      if (body.phoneNumber !== undefined) {
        const phoneValidation = validatePhoneNumberE164(body.phoneNumber);
        if (!phoneValidation.isValid) {
          return new Response(
            JSON.stringify({ error: phoneValidation.error }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }

        updateData.phone_nr = phoneValidation.formatted;

        if (!body.country && phoneValidation.formatted) {
          const detectedCountry = detectCountryFromPhone(phoneValidation.formatted);
          if (detectedCountry) {
            updateData.country = detectedCountry;
          }
        }
      }
      if (body.dateOfBirth !== undefined) {
        const age = parseInt(body.dateOfBirth);
        if (!isNaN(age) && age > 0 && age < 150) {
          updateData.age = age;
        } else if (body.dateOfBirth === '') {
          updateData.age = null;
        }
      }
      if (body.gender !== undefined) updateData.gender = body.gender;
      if (body.country !== undefined) updateData.country = body.country;

      // Always sync full_name with first_name and last_name
      if (body.firstName && body.lastName) {
        updateData.full_name = `${body.firstName} ${body.lastName}`.trim();
      } else if (body.firstName) {
        updateData.full_name = body.firstName.trim();
      }

      // Determine if profile is complete
      const { data: currentProfile } = await supabase
        .from("users")
        .select("first_name, last_name, email, phone_nr")
        .eq("user_id", user.id)
        .maybeSingle();

      const firstName = body.firstName !== undefined ? body.firstName : currentProfile?.first_name;
      const lastName = body.lastName !== undefined ? body.lastName : currentProfile?.last_name;
      const email = body.email !== undefined ? body.email : currentProfile?.email;
      const phoneNumber = updateData.phone_nr !== undefined ? updateData.phone_nr : currentProfile?.phone_nr;

      // Profile is complete if we have first name, last name, and either email or phone
      const hasName = firstName && lastName;
      const hasContact = email || phoneNumber;

      if (hasName && hasContact) {
        updateData.profile_completed = true;
      }

      const { data: profile, error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          id: user.id,
          email: user.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          phoneNumber: profile.phone_nr,
          dateOfBirth: profile.age,
          gender: profile.gender,
          address: "",
          city: "",
          postalCode: "",
          country: profile.country,
          membershipLevel: profile.profile_level,
          profileCompleted: profile.profile_completed,
          totalSavings: parseFloat(profile.total_savings || '0'),
          linkId: profile.link_id,
          updatedAt: profile.updated_at,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "PUT" && pathParts.length === 2 && pathParts[1] === "password") {
      const body: UpdatePasswordRequest = await req.json();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: body.currentPassword,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ error: "Current password is incorrect" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: body.newPassword,
      });

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "DELETE" && pathParts.length === 1) {
      await supabase.from("liked_merchants").delete().eq("user_id", user.id);
      await supabase.from("deal_bookings").delete().eq("user_id", user.id.toString());
      await supabase.from("reviews").delete().eq("user_id", user.id.toString());

      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("user_id", user.id.toString())
        .eq("status", "active");

      await supabase
        .from("users")
        .update({
          deleted_at: new Date().toISOString(),
          status: "deleted"
        })
        .eq("user_id", user.id);

      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(
        user.id,
      );

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: "Account deleted successfully" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
