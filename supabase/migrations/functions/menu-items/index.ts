import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MenuItem {
  id: number;
  merchantId: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  isAvailable: boolean;
  sortOrder: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const merchantId = pathParts[pathParts.length - 1];

    if (!merchantId) {
      return new Response(
        JSON.stringify({ error: "Merchant ID is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { data: menuItems, error } = await supabase
      .from("merchant_menu_items")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch menu items" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const formattedMenuItems: MenuItem[] = (menuItems || []).map((item: any) => ({
      id: item.id,
      merchantId: item.merchant_id,
      name: item.menu_name,
      description: item.description,
      price: item.price,
      category: item.category || "other",
      isAvailable: item.is_available !== false,
      sortOrder: parseInt(item.sort_order || "0"),
    }));

    return new Response(JSON.stringify(formattedMenuItems), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
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
