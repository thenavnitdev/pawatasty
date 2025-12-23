import { callEdgeFunction } from '../edgeFunctions';
import {
  getMerchantLogoUrl,
  getMerchantCoverUrl,
  getDealImageUrl,
} from '../../utils/imageUtils';

export interface Merchant {
  id: string;
  name: string;
  description?: string;
  category?: string;
  merchantCategory?: string;
  businessType?: string;
  subcategoryName?: string;
  specialty?: string[];
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  openDays?: string;
  openTime?: string;
  imageUrl?: string;
  logoId?: string;
  coverImageIds?: string[];
  coverImageUrl?: string;
  rating?: number;
  reviewCount?: number;
  deals?: Deal[];
  distance?: number;
  availableSlots?: number;
  partnershipType?: string;
  occupiedSlots?: number;
  totalSlots?: number;
  returnSlots?: number;
  hasStation?: boolean;
  unitPrice?: string;
  unitMin?: string;
  parentMerchantId?: string;
}

export interface Deal {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  discount?: number;
  saveValue?: number;
  savings?: number;
  originalPrice?: number;
  discountedPrice?: number;
  validFrom: string | null;
  validUntil: string | null;
  terms?: string;
  imageUrl?: string;
  imageIds?: string[];
}

export interface NearbyMerchantsParams {
  lat: string;
  lng: string;
  radius?: string;
}

function normalizeCategory(category: string | undefined): string {
  if (!category) return 'restaurant';
  const normalized = category.toLowerCase().trim();
  const validCategories = ['restaurant', 'cafe', 'bar', 'shop', 'train_station'];
  return validCategories.includes(normalized) ? normalized : 'restaurant';
}

function normalizeBusinessType(businessType: string | undefined): string | undefined {
  if (!businessType) return undefined;

  const normalized = businessType.toLowerCase().trim();

  // FIRST: Check if codes are already stored (exact match)
  if (normalized === 'diningonly') return 'diningonly';
  if (normalized === 'chargingonly') return 'chargingonly';
  if (normalized === 'diningandcharging') return 'diningandcharging';

  // THEN: Map database display text to internal codes
  if (normalized.includes('dine') && normalized.includes('bites') && normalized.includes('drinks') && !normalized.includes('charging')) {
    return 'diningonly';
  }
  if (normalized.includes('charging hub') || (normalized.includes('charging') && !normalized.includes('bites') && !normalized.includes('drinks'))) {
    return 'chargingonly';
  }
  if (normalized.includes('bites') && normalized.includes('drinks') && normalized.includes('charging')) {
    return 'diningandcharging';
  }

  return undefined;
}

function enhanceMerchantImages(merchant: any): Merchant {
  const normalizedBusinessType = normalizeBusinessType(merchant.businessType);

  // Use backend data directly - DO NOT recalculate!
  // The API returns: pbAvailable (powerbanks in station), returnSlots (empty slots), totalSlots (total capacity)
  const pbAvailable = merchant.pbAvailable || merchant.occupiedSlots || merchant.availableSlots || 0;
  const totalSlots = merchant.totalSlots || 0;
  const returnSlots = merchant.returnSlots || 0;

  // Image fallback: Ensure coverImageIds has at least the logo if it's empty
  let coverImageIds = merchant.coverImageIds || [];
  if (coverImageIds.length === 0 && merchant.logoId) {
    coverImageIds = [merchant.logoId];
  }

  return {
    id: merchant.id || merchant.merchantId,
    name: merchant.name || merchant.companyName,
    description: merchant.description || merchant.companyDescription,
    category: normalizeCategory(merchant.category || merchant.businessCategory),
    merchantCategory: normalizedBusinessType || merchant.businessType || merchant.category,
    businessType: normalizedBusinessType,
    subcategoryName: merchant.subcategoryName,
    specialty: merchant.companySpecialty || merchant.specialty || [],
    address: merchant.address,
    city: merchant.city,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    phone: merchant.phone || merchant.phoneNr,
    website: merchant.website,
    openingHours: merchant.opening_hours || merchant.openingHours || `${merchant.openDays || merchant.open_days || ''} ${merchant.openTime || merchant.open_time || ''}`.trim(),
    openDays: merchant.open_days || merchant.openDays,
    openTime: merchant.open_time || merchant.openTime,
    logoId: merchant.logoId,
    coverImageIds: coverImageIds,
    imageUrl: merchant.image_url || merchant.logoId,
    coverImageUrl: coverImageIds[0],
    rating: merchant.rating || 0,
    reviewCount: merchant.reviewCount || 0,
    availableSlots: pbAvailable,
    partnershipType: merchant.partnershipType,
    occupiedSlots: pbAvailable,  // pbAvailable = powerbanks in the station
    totalSlots: totalSlots,
    returnSlots: returnSlots,  // empty slots for returns
    hasStation: merchant.hasStation || totalSlots > 0,
    unitPrice: merchant.unitPrice,
    unitMin: merchant.unitMin,
    parentMerchantId: merchant.parentMerchantId,
    deals: merchant.deals?.map((deal: any) => ({
      id: deal.id,
      merchantId: deal.merchantId,
      title: deal.title,
      description: deal.description,
      discount: deal.discount,
      saveValue: deal.discountedPrice || deal.saveValue,
      savings: deal.discountedPrice || deal.savings,
      originalPrice: deal.originalPrice,
      discountedPrice: deal.discountedPrice,
      validFrom: deal.validFrom,
      validUntil: deal.validUntil,
      terms: deal.terms,
      imageUrl: deal.imageUrl,
      imageIds: deal.imageIds,
    })),
  };
}

export const merchantsEdgeAPI = {
  getAllMerchants: async () => {
    const defaultLat = '52.3676';
    const defaultLng = '4.9041';

    const queryParams = new URLSearchParams({
      latitude: defaultLat,
      longitude: defaultLng,
    });

    const rawMerchants = await callEdgeFunction<any[]>(
      'merchants',
      `?${queryParams.toString()}`,
      { requireAuth: false }
    );

    console.log('📍 Raw merchants from edge function:', rawMerchants.length);
    const enhanced = rawMerchants.map(enhanceMerchantImages);
    console.log('📍 Enhanced merchants with coordinates:', enhanced.filter(m => m.latitude && m.longitude).length);
    return enhanced;
  },

  getMerchantById: async (merchantId: string) => {
    const rawMerchant = await callEdgeFunction<any>('merchants', `/${merchantId}`, { requireAuth: false });
    return enhanceMerchantImages(rawMerchant);
  },

  getNearbyMerchants: async (params: NearbyMerchantsParams) => {
    const queryParams = new URLSearchParams({
      lat: params.lat,
      lng: params.lng,
      ...(params.radius && { radius: params.radius }),
    });

    const rawMerchants = await callEdgeFunction<any[]>(
      'merchants',
      `?${queryParams.toString()}`,
      { requireAuth: false }
    );
    return rawMerchants.map(enhanceMerchantImages);
  },

  getMerchantCoverImages: (merchant: Merchant, maxCount: number = 5): string[] => {
    const coverIds = merchant.coverImageIds || [];
    return coverIds
      .slice(0, maxCount)
      .map(id => getMerchantCoverUrl(id))
      .filter(url => url !== null) as string[];
  },
};
