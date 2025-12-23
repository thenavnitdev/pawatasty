import { apiClient } from './client';

export interface DealBooking {
  id: string;
  userId: string;
  dealId: string;
  merchantId: string;
  bookingDate: string;
  bookingTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  partySize?: number;
  specialRequests?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface BookDealRequest {
  bookingDate: string;
  bookingTime: string;
  partySize?: number;
  specialRequests?: string;
}

export const dealsAPI = {
  bookDeal: (dealId: string, data: BookDealRequest) =>
    apiClient.post<DealBooking>(`/deals/${dealId}/book`, data),

  getBookings: () =>
    apiClient.get<DealBooking[]>('/bookings'),
};
