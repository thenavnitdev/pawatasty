import { apiClient } from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  stripePriceId?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: string;
  endDate: string;
  cancelledAt?: string;
  stripeSubscriptionId?: string;
  plan?: SubscriptionPlan;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
}

export interface CreatePaymentIntentRequest {
  planId: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  subscriptionId: string;
}

export const subscriptionsAPI = {
  getPlans: () =>
    apiClient.get<SubscriptionPlan[]>('/api/subscription-plans', undefined, true),

  subscribe: (data: CreateSubscriptionRequest) =>
    apiClient.post<Subscription>('/api/subscriptions', data),

  getActiveSubscription: () =>
    apiClient.get<Subscription | null>('/api/subscriptions/active'),

  createPaymentIntent: (data: CreatePaymentIntentRequest) =>
    apiClient.post<PaymentIntentResponse>('/api/create-subscription-payment', data),
};
