import { callEdgeFunction } from '../edgeFunctions';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  membershipLevel?: string;
  profileCompleted?: boolean;
  linkId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const profileEdgeAPI = {
  getProfile: () =>
    callEdgeFunction<UserProfile>('user-profile', ''),

  updateProfile: (data: UpdateProfileRequest) =>
    callEdgeFunction<UserProfile>('user-profile', '', {
      method: 'PUT',
      body: data,
    }),

  updatePassword: (data: UpdatePasswordRequest) =>
    callEdgeFunction<{ success: boolean; message: string }>(
      'user-profile',
      '/password',
      {
        method: 'PUT',
        body: data,
      }
    ),

  deleteAccount: () =>
    callEdgeFunction<{ success: boolean; message: string }>(
      'user-profile',
      '',
      { method: 'DELETE' }
    ),
};
