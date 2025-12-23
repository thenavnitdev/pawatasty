import { callEdgeFunction } from '../edgeFunctions';

export interface PromoCodeResponse {
  promoCode: string;
  referralCount: number;
  totalPointsEarned: number;
}

export interface ApplyPromoCodeResponse {
  success: boolean;
  message: string;
  pointsEarned?: number;
  pointsAwarded?: number;
  code?: string;
}

export const promoCodesEdgeAPI = {
  async getUserPromoCode(): Promise<PromoCodeResponse> {
    return callEdgeFunction<PromoCodeResponse>('user-promo-code');
  },

  async applyPromoCode(promoCode: string): Promise<ApplyPromoCodeResponse> {
    return callEdgeFunction<ApplyPromoCodeResponse>('apply-promo-code', '', {
      method: 'POST',
      body: { promoCode },
    });
  },
};
