import { supabase } from '../../lib/supabase';

export interface UserBooking {
  id: string;
  userId: string;
  dealId: string;
  merchantId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
  bookingDate: string;
  booking_date?: string;
  booking_time?: string;
  guests?: number;
  specialRequests?: string;
  createdAt: string;
  completedAt?: string;
  dealImage?: string;
  deal?: {
    id: string;
    title: string;
    description: string;
    discount?: number;
    image?: string;
  };
  merchant?: {
    id: string;
    name: string;
    address: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address: string;
  };
}

export interface CreateUserBookingRequest {
  bookingDate: string;
  guests?: number;
  specialRequests?: string;
  restaurantId?: string;
}

export interface UserBookingsResponse {
  bookings: UserBooking[];
  total: number;
}

export const bookingsEdgeAPI = {
  bookDeal: async (dealId: string, data: CreateUserBookingRequest): Promise<UserBooking> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-booking/deals/${dealId}/book`;
    console.log('🌐 Booking API URL:', url);
    console.log('🆔 Deal ID:', dealId, 'Type:', typeof dealId);

    // DIAGNOSTIC: Show user what's happening
    console.log('==========================================');
    console.log('BOOKING ATTEMPT:');
    console.log('  Deal ID:', dealId);
    console.log('  URL:', url);
    console.log('  Has session:', !!session);
    console.log('==========================================');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(data),
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Booking API error:', errorText);

      // DIAGNOSTIC: Show detailed error
      console.log('==========================================');
      console.log('BOOKING FAILED:');
      console.log('  Status:', response.status);
      console.log('  Error:', errorText);
      console.log('  Deal ID was:', dealId);
      console.log('  URL was:', url);
      console.log('==========================================');

      alert(`BOOKING ERROR:\nStatus: ${response.status}\nDeal ID: ${dealId}\nError: ${errorText}\n\nCheck console for details!`);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      throw new Error(errorData.error || errorText || `Failed to book deal: ${response.statusText}`);
    }

    return response.json();
  },

  getUserBookings: async (): Promise<UserBookingsResponse> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-booking/bookings`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch bookings: ${response.statusText}`);
    }

    return response.json();
  },

  getBookingById: async (bookingId: string): Promise<UserBooking> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-booking/bookings/${bookingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch booking: ${response.statusText}`);
    }

    return response.json();
  },

  cancelBooking: async (bookingId: string): Promise<UserBooking> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-booking/bookings/${bookingId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to cancel booking: ${response.statusText}`);
    }

    return response.json();
  },
};
