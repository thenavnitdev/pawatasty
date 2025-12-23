import { apiClient } from './client';
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
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  imageUrl?: string;
  logoId?: string;
  coverImageIds?: string[];
  coverImageUrl?: string;
  rating?: number;
  deals?: Deal[];
  distance?: number;
  availableSlots?: number;
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

/**
 * Enhances merchant data with optimized image URLs
 */
function enhanceMerchantImages(merchant: Merchant): Merchant {
  // Get the first cover image ID if available
  let coverImageId = merchant.coverImageIds?.[0] || merchant.coverImageUrl;

  // Log for debugging
  if (merchant.coverImageIds && merchant.coverImageIds.length > 0) {
    console.log(`Merchant ${merchant.name} cover images:`, merchant.coverImageIds);
  }

  return {
    ...merchant,
    imageUrl: getMerchantLogoUrl(merchant.logoId || merchant.imageUrl),
    coverImageUrl: getMerchantCoverUrl(coverImageId),
    deals: merchant.deals?.map(deal => ({
      ...deal,
      imageUrl: getDealImageUrl(deal.imageUrl),
    })),
  };
}

export const merchantsAPI = {
  getAllMerchants: async () => {
    const rawMerchants = await apiClient.get<any[]>('/api/merchants');
    console.log('Raw merchants from API (first merchant):', rawMerchants[0]);

    // Convert backend format to our Merchant interface
    const merchants: Merchant[] = rawMerchants.map(m => ({
      id: m.merchantId,
      name: m.companyName,
      description: m.companyDescription,
      category: m.businessCategory,
      address: m.address,
      latitude: m.latitude,
      longitude: m.longitude,
      phone: m.phoneNr,
      website: m.website,
      openingHours: `${m.openDays || ''} ${m.openTime || ''}`.trim(),
      logoId: m.logoId,
      coverImageIds: m.coverImageIds || [],
      rating: m.rating,
      availableSlots: m.availableSlots || 0,
    }));

    console.log('Converted merchants (first merchant):', merchants[0]);
    const enhanced = merchants.map(enhanceMerchantImages);
    console.log('Enhanced merchants (first merchant):', enhanced[0]);

    return enhanced;
  },

  getMerchantById: async (merchantId: string) => {
    const rawMerchant = await apiClient.get<any>(`/api/merchants/${merchantId}`);
    console.log('Raw merchant by ID:', rawMerchant);

    const merchant: Merchant = {
      id: rawMerchant.merchantId,
      name: rawMerchant.companyName,
      description: rawMerchant.companyDescription,
      category: rawMerchant.businessCategory,
      address: rawMerchant.address,
      latitude: rawMerchant.latitude,
      longitude: rawMerchant.longitude,
      phone: rawMerchant.phoneNr,
      website: rawMerchant.website,
      openingHours: `${rawMerchant.openDays || ''} ${rawMerchant.openTime || ''}`.trim(),
      logoId: rawMerchant.logoId,
      coverImageIds: rawMerchant.coverImageIds || [],
      rating: rawMerchant.rating,
    };

    const enhanced = enhanceMerchantImages(merchant);
    console.log('Enhanced merchant by ID:', enhanced);

    return enhanced;
  },

  getNearbyMerchants: async (params: NearbyMerchantsParams) => {
    const queryParams: Record<string, string> = {
      lat: params.lat,
      lng: params.lng,
      ...(params.radius && { radius: params.radius }),
    };
    const merchants = await apiClient.get<Merchant[]>(
      '/api/merchants/nearby',
      queryParams
    );
    return merchants.map(enhanceMerchantImages);
  },

  // Helper to get multiple cover images for a merchant
  getMerchantCoverImages: (merchant: Merchant, maxCount: number = 5): string[] => {
    const coverIds = merchant.coverImageIds || [];
    console.log(`Getting ${maxCount} cover images from:`, coverIds);

    const urls = coverIds
      .slice(0, maxCount)
      .map(id => {
        const url = getMerchantCoverUrl(id);
        console.log(`  Cover ID ${id} -> ${url}`);
        return url;
      })
      .filter(url => url !== null) as string[];

    return urls;
  },
};
