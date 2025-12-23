import { callEdgeFunction } from '../edgeFunctions';

export interface PromoContent {
  id: number;
  promo_title: string;
  content_type: 'text' | 'image';
  text_content: string | null;
  image_url: string | null;
  target_flex_users: boolean;
  target_subscription_users: boolean;
  is_active: boolean;
  display_nr: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
}

export interface PromoContentResponse {
  success: boolean;
  promos: PromoContent[];
  userSubscriptionType: string;
}

export const promoContentAPI = {
  /**
   * Fetch active promo content for the authenticated user
   * Filters by user's subscription type (flex vs subscription)
   * Only returns active promos within scheduled time range
   */
  async getActivePromos(): Promise<PromoContentResponse> {
    return callEdgeFunction<PromoContentResponse>('promo-content');
  }
};
