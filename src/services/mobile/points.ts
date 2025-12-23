import { supabase } from '../../lib/supabase';

export interface PointsBalance {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  pendingPoints: number;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'spent' | 'expired' | 'refunded';
  source: 'referral' | 'purchase' | 'promo' | 'subscription' | 'booking';
  description: string;
  orderId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserEmail?: string;
  status: 'pending' | 'completed' | 'rewarded';
  pointsEarned: number;
  createdAt: string;
  completedAt?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const pointsAPI = {
  getBalance: async (): Promise<PointsBalance> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/points-balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch points balance');
    }

    return response.json();
  },

  getTransactions: async (): Promise<PointsTransaction[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/points-transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch points transactions');
    }

    return response.json();
  },

  getReferrals: async (): Promise<Referral[]> => {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
