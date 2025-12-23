import { apiClient } from './client';

export interface UserBooking {
  id: string;
  userId: string;
  dealId: string;
  merchantId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookingDate: string;
  guests?: number;
  specialRequests?: string;
  createdAt: string;
  deal?: {
    id: string;
    title: string;
    description: string;
    discount?: number;
  };
  merchant?: {
    id: string;
    name: string;
    address: string;
  };
}

export interface CreateUserBookingRequest {
  dealId: string;
  bookingDate: string;
  guests?: number;
  specialRequests?: string;
}

export interface UserBookingsResponse {
  bookings: UserBooking[];
  total: number;
}

export const bookingsAPI = {
  bookDeal: (dealId: string, data: Omit<CreateUserBookingRequest, 'dealId'>) =>
    apiClient.post<UserBooking>(`/api/deals/${dealId}/book`, data),

  getUserBookings: () =>
    apiClient.get<UserBookingsResponse>('/api/bookings'),

  getBookingById: (bookingId: string) =>
    apiClient.get<UserBooking>(`/api/bookings/${bookingId}`),

  cancelBooking: (bookingId: string) =>
    apiClient.post<UserBooking>(`/api/bookings/${bookingId}/cancel`, {}),

  completeBooking: (bookingId: string) =>
    apiClient.post<UserBooking>(`/api/bookings/${bookingId}/complete`, {}),
};
