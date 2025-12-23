import { supabase } from '../../lib/supabase';

export interface PromoCode {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'points';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
}

export interface ApplyPromoCodeRequest {
  promoCode: string;
  orderAmount?: number;
}

export interface ApplyPromoCodeResponse {
  success: boolean;
  message: string;
  discount?: number;
  pointsEarned?: number;
  promoCode?: PromoCode;
  code?: string;
}

export interface UserPromoCodeResponse {
  promoCode: string;
  referralCount: number;
  totalPointsEarned: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const promoCodesAPI = {
  applyPromoCode: async (request: ApplyPromoCodeRequest): Promise<ApplyPromoCodeResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/apply-promo-code`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    // Return the response even if not ok, so we can handle structured errors
    if (!response.ok) {
      // If it's a structured response with success: false, return it
      if (data.hasOwnProperty('success') && data.success === false) {
        return data;
      }
      // Otherwise throw
      throw new Error(data.message || data.error || 'Failed to apply promo code');
    }

    return data;
  },

  getUserPromoCode: async (): Promise<UserPromoCodeResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/user-promo-code`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch promo code');
    }

    return response.json();
  },
};
