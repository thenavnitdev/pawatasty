import { supabase } from '../../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'applepay' | 'googlepay' | 'bancontact' | 'sepa_debit';
  lastFour: string;
  cardholderName?: string;
  email?: string;
  isPrimary: boolean;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  createdAt: string;
}

export interface SavePaymentMethodRequest {
  type: 'card' | 'applepay' | 'googlepay' | 'bancontact' | 'sepa_debit';
  cardNumber?: string;
  cardholderName?: string;
  expiryDate?: string;
  cvv?: string;
  email?: string;
  iban?: string;
  isPrimary?: boolean;
  stripePaymentMethodId?: string;
}

export interface PaymentMethodsResponse {
  paymentMethods: PaymentMethod[];
}

const getAuthHeaders = async (accessToken?: string) => {
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    token = session.access_token;
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
  };
};

export const paymentMethodsAPI = {
  savePaymentMethod: async (data: SavePaymentMethodRequest): Promise<PaymentMethod> => {
    console.log('Saving payment method:', { type: data.type });
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${supabaseUrl}/functions/v1/payment-methods`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to save payment method';
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      console.error('Payment method error:', errorMessage);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  getPaymentMethods: async (accessToken?: string): Promise<PaymentMethodsResponse> => {
    const headers = await getAuthHeaders(accessToken);
    const response = await fetch(
      `${supabaseUrl}/functions/v1/payment-methods`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to get payment methods');
    }

    return response.json();
  },

  deletePaymentMethod: async (paymentMethodId: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${supabaseUrl}/functions/v1/payment-methods/${paymentMethodId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to delete payment method');
    }

    return response.json();
  },

  setDefaultPaymentMethod: async (paymentMethodId: string): Promise<PaymentMethod> => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${supabaseUrl}/functions/v1/payment-methods/${paymentMethodId}/default`,
      {
        method: 'PUT',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to set default payment method');
    }

    return response.json();
  },

  completeSetup: async (paymentMethodId: string, setupIntentId: string): Promise<PaymentMethod> => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${supabaseUrl}/functions/v1/payment-methods/${paymentMethodId}/complete`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ setupIntentId }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to complete payment method setup');
    }

    return response.json();
  },

  completePaymentMethodSetup: async (paymentMethodId: string, setupIntentId: string): Promise<PaymentMethod> => {
    return paymentMethodsAPI.completeSetup(paymentMethodId, setupIntentId);
  },
};
