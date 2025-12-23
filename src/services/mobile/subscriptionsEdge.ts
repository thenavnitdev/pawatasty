import { callEdgeFunction } from '../edgeFunctions';

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: string;
  price: number;
  minutes: number;
  dailyFreeMinutes: number;
  features: any;
  penaltyFee: number;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt: string;
  plan: SubscriptionPlan;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
}

export const subscriptionsEdgeAPI = {
  getPlans: () =>
    callEdgeFunction<SubscriptionPlan[]>('subscriptions', '/plans', { requireAuth: false }),

  getSubscriptions: () =>
    callEdgeFunction<Subscription[]>('subscriptions', '/subscriptions'),

  getActiveSubscription: () =>
    callEdgeFunction<Subscription>('subscriptions', '/subscriptions/active'),

  createSubscription: (data: CreateSubscriptionRequest) =>
    callEdgeFunction<Subscription>('subscriptions', '/subscriptions', {
      method: 'POST',
      body: data,
    }),

  cancelSubscription: (subscriptionId: string) =>
    callEdgeFunction<{ success: boolean; message: string }>(
      'subscriptions',
      `/subscriptions/${subscriptionId}`,
      { method: 'DELETE' }
    ),
};
