import { callEdgeFunction } from '../edgeFunctions';

export interface PointsBalance {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  pendingPoints: number;
}

export interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  type: 'earned' | 'spent' | 'expired';
  description: string;
  createdAt: string;
}

export interface PointsTransactionsResponse {
  transactions: PointTransaction[];
  total: number;
}

export const pointsEdgeAPI = {
  async getBalance(): Promise<PointsBalance> {
    return callEdgeFunction<PointsBalance>('points-balance');
  },

  async getTransactions(limit = 50, offset = 0): Promise<PointsTransactionsResponse> {
    const path = `?limit=${limit}&offset=${offset}`;
    return callEdgeFunction<PointsTransactionsResponse>('points-transactions', path);
  },
};
