import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function getImageId(merchant: any): string | null {
  if (!merchant.logo_id) return null;
  return merchant.logo_id;
}

function getCoverImageIds(merchant: any): string[] {
  if (!merchant.cover_image_ids) return [];
  
  try {
    if (typeof merchant.cover_image_ids === 'string') {
      return JSON.parse(merchant.cover_image_ids);
    }
    if (Array.isArray(merchant.cover_image_ids)) {
      return merchant.cover_image_ids;
    }
  } catch (e) {
    console.error('Error parsing cover_image_ids:', e);
  }
  return [];
}

function getDealImageIds(deal: any): string[] {
  if (!deal.image_ids) return [];
  
  try {
    if (typeof deal.image_ids === 'string') {
      return JSON.parse(deal.image_ids);
    }
    if (Array.isArray(deal.image_ids)) {
      return deal.image_ids;
    }
  } catch (e) {
    console.error('Error parsing deal image_ids:', e);
  }
  return [];
}

function transformMerchant(merchant: any, branch: any = null, stationData: any = null) {
  const imageId = getImageId(merchant);
  const merchantCoverImageIds = getCoverImageIds(merchant);
  const branchCoverImageIds = branch ? getCoverImageIds(branch) : [];

  let coverImageIds = branchCoverImageIds.length > 0 ? branchCoverImageIds : merchantCoverImageIds;
  if (coverImageIds.length === 0 && imageId) {
    coverImageIds = [imageId];
  }
  let latitude = null;
  let longitude = null;

  if (branch) {
    latitude = branch.latitude ? parseFloat(branch.latitude) : null;
    longitude = branch.longitude ? parseFloat(branch.longitude) : null;
    console.log('📍 Branch coordinates:', {
      branchId: branch.branch_id,
      rawLat: branch.latitude,
      rawLng: branch.longitude,
      parsedLat: latitude,
      parsedLng: longitude,
    });
  } else {
    latitude = merchant.latitude || null;
    longitude = merchant.longitude || null;
    console.log('📍 Merchant coordinates:', {
      merchantId: merchant.merchant_id,
      rawLat: merchant.latitude,
      rawLng: merchant.longitude,
      parsedLat: latitude,
      parsedLng: longitude,
    });
  }

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    console.log('⚠️ Invalid coordinates, setting to null:', {
      id: branch ? branch.branch_id : merchant.merchant_id,
      latitude,
      longitude,
    });
    latitude = null;
    longitude = null;
  }
  const address = branch ? branch.address : (merchant.address || '');
  const city = branch ? (branch.city || merchant.city) : (merchant.city || '');

  let displayName = branch ? branch.branch_name : merchant.company_name;

  const merchantId = branch ? branch.branch_id : merchant.merchant_id;

  const totalSlots = stationData?.total_capacity || 0;
  const pbAvailable = stationData?.pb_available || 0;
  const returnSlots = stationData?.return_slots || 0;

  const subcategoryDisplayName = merchant.subcategory_name || 'Dining & Charging';
  console.log('🏷️ Subcategory name:', {
    merchantId,
    subcategoryFromMerchant: merchant.subcategory_name,
    subcategoryDisplayName,
  });

  let companySpecialty: string[] = [];
  if (merchant.company_specialty) {
    try {
      if (typeof merchant.company_specialty === 'string') {
        companySpecialty = merchant.company_specialty
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      } else if (Array.isArray(merchant.company_specialty)) {
        companySpecialty = merchant.company_specialty;
      }
    } catch (e) {
      console.error('Error parsing company_specialty:', e);
      companySpecialty = [];
    }
  }

  return {
    id: merchantId,
    name: displayName,
    address: address,
    city: city,
    category: subcategoryDisplayName,
    businessType: merchant.business_type || 'diningandcharging',
    subcategoryName: subcategoryDisplayName,
    companySpecialty: companySpecialty,
    image_url: imageId,
    logoId: imageId,
    coverImageIds: coverImageIds,
    latitude: latitude,
    longitude: longitude,
    rating: parseFloat(merchant.rating) || 0,
    reviewCount: merchant.review_count || merchant.total_reviews || 0,
    phone: merchant.phone_nr,
    website: merchant.website,
    opening_hours: merchant.open_time,
    open_days: merchant.open_days,
    open_time: merchant.open_time,
    partnershipType: merchant.partnership_type,
    totalSlots: totalSlots,
    pbAvailable: pbAvailable,
    occupiedSlots: pbAvailable,
    returnSlots: returnSlots,
    availableSlots: pbAvailable,
    unitPrice: merchant.unit_price || '1',
    unitMin: merchant.unit_min || '60',
    parentMerchantId: merchant.merchant_id,
  };
}

function transformDeal(deal: any) {
  const imageIds = getDealImageIds(deal);
  return {
    id: deal.id,
    merchantId: deal.merchant_id,
    title: deal.deal_name,
    description: deal.description || '',
    originalPrice: parseFloat(deal.price_value) || 0,
    discountedPrice: parseFloat(deal.save_value) || 0,
    discountAmount: 0,
    discountPercent: deal.discount_percentage || '0',
    imageIds: imageIds,
    imageUrl: imageIds.length > 0 ? imageIds[0] : null,
    validFrom: null,
    validUntil: null,
    isActive: deal.bookable === true,
    pointsRequired: 0,
    category: null,
    status: deal.bookable ? 'active' : 'inactive',
    bookingQty: deal.bookable_qty || 0,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET') {
      if (pathParts.length >= 2 && pathParts[1]) {
        const merchantId = pathParts[1];
        console.log('Fetching merchant by ID:', merchantId);

        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select(`*`)
          .eq('merchant_id', merchantId)
          .single();

        if (merchantError) throw merchantError;
        if (!merchant) throw new Error('Merchant not found');

        const { data: branches } = await supabase
          .from('merchant_branches')
          .select('*')
          .eq('merchant_id', merchant.merchant_id);

        const branch = branches && branches.length > 0 ? branches[0] : null;

        const { data: stationItems } = await supabase
          .from('station_items')
          .select('branch_id, total_capacity, pb_available, return_slots')
          .eq('merchant_id', merchant.merchant_id);

        let stationData = null;
        if (stationItems && stationItems.length > 0) {
          let filteredStations;

          if (branch && branch.branch_id) {
            filteredStations = stationItems.filter(s => s.branch_id === branch.branch_id);
          } else {
            filteredStations = stationItems.filter(s => !s.branch_id || s.branch_id.trim() === '');
          }

          if (filteredStations.length > 0) {
            const totalCapacity = filteredStations.reduce((sum, s) => sum + (s.total_capacity || 0), 0);
            const pbAvailable = filteredStations.reduce((sum, s) => sum + (s.pb_available || 0), 0);
            const returnSlots = filteredStations.reduce((sum, s) => sum + (s.return_slots || 0), 0);
            stationData = {
              total_capacity: totalCapacity,
              pb_available: pbAvailable,
              return_slots: returnSlots,
            };
          }
        }

        const transformedMerchant = transformMerchant(merchant, branch, stationData);

        const { data: deals } = await supabase
          .from('merchant_deals')
          .select('*')
          .eq('merchant_id', merchant.merchant_id);

        const transformedDeals = deals ? deals.map(transformDeal) : [];

        return new Response(
          JSON.stringify({ ...transformedMerchant, deals: transformedDeals }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const latitude = url.searchParams.get('latitude');
      const longitude = url.searchParams.get('longitude');
      const category = url.searchParams.get('category');
      const subcategory = url.searchParams.get('subcategory');

      let query = supabase
        .from('merchants')
        .select(`*`);

      if (category) {
        query = query.eq('business_type', category);
      }

      if (subcategory) {
        query = query.eq('subcategory_name', subcategory);
      }

      const { data: merchants, error: merchantsError } = await query;

      if (merchantsError) throw merchantsError;

      const { data: allBranches } = await supabase
        .from('merchant_branches')
        .select('*');

      const { data: allStationItems } = await supabase
        .from('station_items')
        .select('merchant_id, branch_id, total_capacity, pb_available, return_slots');

      const { data: allDeals } = await supabase
        .from('merchant_deals')
        .select('*');

      const merchantsWithBranches: any[] = [];

      merchants?.forEach(merchant => {
        const merchantBranches = allBranches?.filter(b => b.merchant_id === merchant.merchant_id) || [];

        if (merchantBranches.length > 0) {
          merchantBranches.forEach(branch => {
            const branchStations = allStationItems?.filter(s => 
              s.merchant_id === merchant.merchant_id && s.branch_id === branch.branch_id
            ) || [];

            let stationData = null;
            if (branchStations.length > 0) {
              const totalCapacity = branchStations.reduce((sum, s) => sum + (s.total_capacity || 0), 0);
              const pbAvailable = branchStations.reduce((sum, s) => sum + (s.pb_available || 0), 0);
              const returnSlots = branchStations.reduce((sum, s) => sum + (s.return_slots || 0), 0);
              stationData = {
                total_capacity: totalCapacity,
                pb_available: pbAvailable,
                return_slots: returnSlots,
              };
            }

            const merchantDeals = allDeals?.filter(d => d.merchant_id === merchant.merchant_id) || [];
            const transformedDeals = merchantDeals.map(transformDeal);

            merchantsWithBranches.push({
              ...transformMerchant(merchant, branch, stationData),
              deals: transformedDeals,
            });
          });
        } else {
          const merchantStations = allStationItems?.filter(s => 
            s.merchant_id === merchant.merchant_id && (!s.branch_id || s.branch_id.trim() === '')
          ) || [];

          let stationData = null;
          if (merchantStations.length > 0) {
            const totalCapacity = merchantStations.reduce((sum, s) => sum + (s.total_capacity || 0), 0);
            const pbAvailable = merchantStations.reduce((sum, s) => sum + (s.pb_available || 0), 0);
            const returnSlots = merchantStations.reduce((sum, s) => sum + (s.return_slots || 0), 0);
            stationData = {
              total_capacity: totalCapacity,
              pb_available: pbAvailable,
              return_slots: returnSlots,
            };
          }

          const merchantDeals = allDeals?.filter(d => d.merchant_id === merchant.merchant_id) || [];
          const transformedDeals = merchantDeals.map(transformDeal);

          merchantsWithBranches.push({
            ...transformMerchant(merchant, null, stationData),
            deals: transformedDeals,
          });
        }
      });

      console.log('📊 Summary:', {
        totalMerchants: merchantsWithBranches.length,
        withValidCoordinates: merchantsWithBranches.filter(m => m.latitude && m.longitude).length,
        withoutCoordinates: merchantsWithBranches.filter(m => !m.latitude || !m.longitude).length,
      });

      return new Response(
        JSON.stringify(merchantsWithBranches),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Method not allowed');
  } catch (error) {
    console.error('Error:', error);
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