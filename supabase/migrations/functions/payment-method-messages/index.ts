import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const url = new URL(req.url);
    const paymentMethodType = url.searchParams.get("type");
    const language = url.searchParams.get("language") || "en";

    if (!paymentMethodType) {
      return new Response(
        JSON.stringify({ error: "Payment method type is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: messages, error } = await supabase
      .from("payment_method_messages")
      .select("message_type, message_text")
      .eq("payment_method_type", paymentMethodType)
      .eq("language", language);

    if (error) {
      console.error("Error fetching messages:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const messagesObject = messages.reduce((acc: any, msg: any) => {
      acc[msg.message_type] = msg.message_text;
      return acc;
    }, {});

    return new Response(
      JSON.stringify({ success: true, messages: messagesObject }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});