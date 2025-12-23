import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { PaymentRequest } from '@stripe/stripe-js';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentRequestSetupProps {
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  customerName: string;
  customerEmail: string;
}

export default function PaymentRequestSetup({
  onSuccess,
  onError,
  customerName,
  customerEmail,
}: PaymentRequestSetupProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  useEffect(() => {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (!stripe || !elements) {
      return;
    }

    if (!isHttps && !isLocalhost) {
      setWarning('Digital wallets require a secure HTTPS connection. Apple Pay will not be available.');
      return;
    }

    if (isLocalhost) {
      setWarning('Apple Pay requires HTTPS and domain verification. Only Google Pay may be available in development.');
    }

    const pr = stripe.paymentRequest({
      country: 'NL',
      currency: 'eur',
      total: {
        label: 'Payment Method Setup',
        amount: 50,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then(result => {
      if (result) {
        const wallets: string[] = [];
        if (result.applePay) wallets.push('Apple Pay');
        if (result.googlePay) wallets.push('Google Pay');

        setAvailableWallets(wallets);
        setPaymentRequest(pr);
        setCanMakePayment(true);

        if (isLocalhost && !result.applePay && result.googlePay) {
          setWarning('Google Pay is available. Apple Pay requires HTTPS domain verification and will only work in production.');
        } else if (isLocalhost && result.applePay) {
          setWarning(null);
        }
      } else {
        setWarning('No digital wallets (Apple Pay / Google Pay) are available on this device or browser.');
      }
    }).catch(err => {
      console.error('PaymentRequest.canMakePayment error:', err);
      setWarning('Unable to check digital wallet availability. Please use card payment.');
    });

    pr.on('paymentmethod', async (ev) => {
      setProcessing(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-methods/payment-request-setup`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerName,
              customerEmail,
              amount: 50,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment');
        }

        const data = await response.json();

        if (!data.clientSecret || !data.paymentMethodId) {
          throw new Error('Invalid response from server');
        }

        const result = await stripe.confirmCardPayment(
          data.clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (result.error) {
          throw new Error(result.error.message || 'Payment failed');
        }

        if (result.paymentIntent?.status === 'succeeded') {
          ev.complete('success');
          onSuccess(data.paymentMethodId);
        } else {
          throw new Error('Payment was not successful');
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to set up payment method';
        setError(errorMessage);
        onError(errorMessage);
        ev.complete('fail');
        setProcessing(false);
      }
    });

    return () => {
      pr.abort();
    };
  }, [stripe, elements, onSuccess, onError, customerName, customerEmail]);

  if (!canMakePayment || !paymentRequest) {
    if (warning) {
      return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium">Digital Wallet Information</p>
            <p className="text-sm text-blue-700 mt-1">{warning}</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>First Payment: €0.50</strong>
          <br />
          This initial charge verifies your payment method and enables automatic subscription payments.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {warning && !error && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-700">{warning}</p>
            {availableWallets.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Available: {availableWallets.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {processing ? (
        <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm text-gray-700">Processing payment...</span>
        </div>
      ) : (
        <div className="payment-request-button">
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: 'default',
                  theme: 'dark',
                  height: '48px',
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
