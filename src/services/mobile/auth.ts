import { apiClient } from './client';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  user?: {
    id: string;
    email: string;
    phone?: string;
  };
  dbUser?: {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
  };
  accessToken?: string;
  token?: string;
}

export interface FirebaseSyncRequest {
  firebaseUid: string;
  email?: string;
  phone?: string;
}

export interface VerifyOTPRequest {
  phone: string;
  code: string;
}

export interface RequestVerificationRequest {
  phone: string;
}

export const authAPI = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/api/auth/supabase/email/signup', data, true),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/api/auth/supabase/email/signin', data, true),

  verify: () =>
    apiClient.get<{ valid: boolean; user: AuthResponse['user'] }>('/api/mobile/auth/verify'),

  sendOTP: (data: { phone: string }) =>
    apiClient.post<{ success: boolean; message: string }>('/api/auth/phone/send-otp', data, true),

  verifyOTP: (data: VerifyOTPRequest) =>
    apiClient.post<AuthResponse>('/api/auth/phone/verify-otp', data, true),

  firebaseAuth: (data: { idToken: string }) =>
    apiClient.post<AuthResponse>('/api/mobile/auth/firebase', data, true),
};
