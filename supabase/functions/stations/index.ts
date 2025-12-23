import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /stations/:stationId - Get station by ID
    if (req.method === "GET" && pathParts.length === 2) {
      const stationId = pathParts[1];

      const { data: station, error: stationError } = await supabase
        .from("station_items")
        .select(`
          *,
          merchants(merchant_id, company_name)
        `)
        .eq("id", stationId)
        .maybeSingle();

      if (stationError) throw stationError;
      if (!station) {
        return new Response(
          JSON.stringify({ error: "Station not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const totalCapacity = station.total_capacity || 0;
      const pbAvailable = station.pb_available || 0;
      const returnSlots = station.return_slots || 0;

      const formattedStation = {
        id: station.id,
        name: station.name,
        address: station.address,
        latitude: station.latitude,
        longitude: station.longitude,
        totalSlots: totalCapacity,
        pbAvailable: pbAvailable,
        availableSlots: pbAvailable,
        occupiedSlots: pbAvailable,
        returnSlots: returnSlots,
        powerbankCapacity: station.powerbank_capacity,
        status: station.status,
        merchantId: station.merchant_id,
        merchant: station.merchants ? {
          id: station.merchants.merchant_id,
          name: station.merchants.company_name,
        } : undefined,
      };

      return new Response(JSON.stringify(formattedStation), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // GET /stations - Get all stations or nearby stations
    if (req.method === "GET" && pathParts.length === 1) {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      const radius = url.searchParams.get("radius") || "5000";

      let query = supabase
        .from("station_items")
        .select(`
          *,
          merchants(merchant_id, company_name)
        `);

      // If lat/lng provided, filter by distance
      if (lat && lng) {
        const radiusMeters = parseInt(radius);
        query = query.rpc("stations_within_radius", {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius_meters: radiusMeters,
        });
      }

      const { data: stations, error: stationsError } = await query;

      if (stationsError) {
        console.error("Stations query error:", stationsError);
        throw stationsError;
      }

      const formattedStations = stations.map((station: any) => {
        const totalCapacity = station.total_capacity || 0;
        const pbAvailable = station.pb_available || 0;
        const returnSlots = station.return_slots || 0;

        return {
          id: station.id,
          name: station.name,
          address: station.address,
          latitude: station.latitude,
          longitude: station.longitude,
          totalSlots: totalCapacity,
          pbAvailable: pbAvailable,
          availableSlots: pbAvailable,
          occupiedSlots: pbAvailable,
          returnSlots: returnSlots,
          powerbankCapacity: station.powerbank_capacity,
          status: station.status,
          merchantId: station.merchant_id,
          merchant: station.merchants ? {
            id: station.merchants.merchant_id,
            name: station.merchants.company_name,
          } : undefined,
          distance: station.distance,
        };
      });

      return new Response(JSON.stringify(formattedStations), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
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
    console.error("Error:", error);
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