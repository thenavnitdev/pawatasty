import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const cityMappings = [
  {
    normalized: 'Den Haag',
    country: 'NL',
    variations: [
      's-gravenhage',
      "'s-gravenhage",
      'S-GRAVENHAGE',
      "'S-GRAVENHAGE",
      'den haag',
      'Den haag',
      'Den Haag',
      'the hague',
      'The Hague',
    ],
  },
  {
    normalized: 'Den Haag',
    country: 'Netherlands',
    variations: [
      's-gravenhage',
      "'s-gravenhage",
      'den haag',
      'Den haag',
      'Den Haag',
      'the hague',
      'The Hague',
    ],
  },
];

function normalizeCityName(cityName: string, country: string): string {
  if (!cityName) return '';

  const trimmedCity = cityName.trim();
  const lowerCity = trimmedCity.toLowerCase();

  for (const mapping of cityMappings) {
    if (mapping.country !== country) continue;

    for (const variation of mapping.variations) {
      if (variation.toLowerCase() === lowerCity) {
        return mapping.normalized;
      }
    }
  }

  return trimmedCity.charAt(0).toUpperCase() + trimmedCity.slice(1);
}

function normalizeCountryCode(country: string): string {
  if (country === 'Netherlands') return 'NL';
  return country;
}

function getCityKey(cityName: string, country: string): string {
  const normalized = normalizeCityName(cityName, country);
  const normalizedCountry = normalizeCountryCode(country);
  return `${normalized.toLowerCase()}-${normalizedCountry}`;
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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: citiesData, error } = await supabase
      .rpc('get_cities_with_deals');

    if (error) {
      console.error('Error fetching cities:', error);

      const { data: manualData } = await supabase
        .from('merchants')
        .select(`
          city,
          country,
          merchant_id,
          latitude,
          longitude,
          merchant_deals!inner(id)
        `)
        .not('city', 'is', null)
        .not('country', 'is', null)
        .eq('business_status', 'active');

      const cityMap = new Map<string, {
        name: string;
        country: string;
        dealCount: number;
        latitude: number | null;
        longitude: number | null;
      }>();

      manualData?.forEach((merchant: any) => {
        const normalizedCityName = normalizeCityName(merchant.city, merchant.country);
        const normalizedCountry = normalizeCountryCode(merchant.country);
        const cityKey = getCityKey(merchant.city, merchant.country);
        const existing = cityMap.get(cityKey);
        const dealCount = merchant.merchant_deals?.length || 0;

        if (existing) {
          existing.dealCount += dealCount;
          if (!existing.latitude && merchant.latitude) {
            existing.latitude = merchant.latitude;
            existing.longitude = merchant.longitude;
          }
        } else {
          cityMap.set(cityKey, {
            name: normalizedCityName,
            country: normalizedCountry,
            dealCount: dealCount,
            latitude: merchant.latitude || null,
            longitude: merchant.longitude || null,
          });
        }
      });

      const cities = Array.from(cityMap.values())
        .filter(city => city.dealCount > 0)
        .sort((a, b) => {
          if (a.country !== b.country) {
            return a.country.localeCompare(b.country);
          }
          return a.name.localeCompare(b.name);
        });

      return new Response(
        JSON.stringify({ cities }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ cities: citiesData || [] }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in cities function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});