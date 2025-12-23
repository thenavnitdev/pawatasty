import { apiClient } from './client';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  promoCode?: string;
  points?: number;
  membershipLevel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface PromoCodeResponse {
  promoCode: string;
  referralCount: number;
}

export const profileAPI = {
  getProfile: () =>
    apiClient.get<UserProfile>('/api/mobile/profile'),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.put<UserProfile>('/api/mobile/profile', data),

  getPromoCode: () =>
    apiClient.get<PromoCodeResponse>('/api/mobile/user/promo-code'),
};
