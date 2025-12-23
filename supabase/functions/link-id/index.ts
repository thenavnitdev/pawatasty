import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function validateLinkId(code: string): { isValid: boolean; error?: string } {
  if (!code) {
    return { isValid: false, error: 'Link ID is required' };
  }

  const upperCode = code.toUpperCase().trim();

  if (upperCode.length !== 6) {
    return { isValid: false, error: 'Link ID must be exactly 6 characters' };
  }

  if (!/^[A-Z0-9]+$/.test(upperCode)) {
    return { isValid: false, error: 'Link ID can only contain letters and numbers' };
  }

  if (!/[A-Z]/.test(upperCode)) {
    return { isValid: false, error: 'Link ID must contain at least one letter' };
  }

  if (!/[0-9]/.test(upperCode)) {
    return { isValid: false, error: 'Link ID must contain at least one number' };
  }

  return { isValid: true };
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

    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "my-code") {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("link_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || !profile.link_id) {
        return new Response(
          JSON.stringify({ error: "Link ID not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({ linkId: profile.link_id }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (req.method === "POST" && pathParts.length === 2 && pathParts[1] === "lookup") {
      const { linkId } = await req.json();

      const validation = validateLinkId(linkId);
      if (!validation.isValid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const upperCode = linkId.toUpperCase().trim();

      const { data: targetUser, error: lookupError } = await supabase
        .from("users")
        .select("user_id, full_name, username, profile_picture, link_id")
        .eq("link_id", upperCode)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: "User not found with this Link ID" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (targetUser.user_id === user.id) {
        return new Response(
          JSON.stringify({ error: "You cannot use your own Link ID" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          userId: targetUser.user_id,
          fullName: targetUser.full_name,
          username: targetUser.username,
          profilePicture: targetUser.profile_picture,
          linkId: targetUser.link_id,
        }),
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