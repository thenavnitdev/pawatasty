import { callEdgeFunction } from '../edgeFunctions';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'paypal';
  lastFour: string;
  cardholderName?: string;
  email?: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isPrimary: boolean;
  stripePaymentMethodId?: string;
  createdAt: string;
}

export interface PaymentMethodsResponse {
  paymentMethods: PaymentMethod[];
}

export const paymentMethodsEdgeAPI = {
  async getPaymentMethods(): Promise<PaymentMethodsResponse> {
    return callEdgeFunction<PaymentMethodsResponse>('payment-methods');
  },

  async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    return callEdgeFunction<PaymentMethod>('payment-methods', '', {
      method: 'POST',
      body: { paymentMethodId },
    });
  },

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return callEdgeFunction<{ success: boolean }>('payment-methods', '', {
      method: 'PUT',
      body: { paymentMethodId, isPrimary: true },
    });
  },

  async deletePaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return callEdgeFunction<{ success: boolean }>('payment-methods', '', {
      method: 'DELETE',
      body: { paymentMethodId },
    });
  },
};
