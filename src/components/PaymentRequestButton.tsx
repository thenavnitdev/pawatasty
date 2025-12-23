import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { PaymentRequest } from '@stripe/stripe-js';
import { AlertCircle, Info } from 'lucide-react';

interface PaymentRequestButtonProps {
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export default function PaymentRequestButton({
  onSuccess,
  onError,
  loading,
  setLoading
}: PaymentRequestButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  useEffect(() => {
    // Check if running on HTTPS
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsSecure(isHttps || isLocalhost);

    if (!stripe || !elements) {
      return;
    }

    // Show warning if not on HTTPS in production
    if (!isHttps && !isLocalhost) {
      setWarning('Digital wallets require a secure HTTPS connection. Apple Pay will not be available.');
      console.warn('PaymentRequest: Not running on HTTPS - Apple Pay requires HTTPS');
      return;
    }

    // Show info if on localhost
    if (isLocalhost) {
      setWarning('Apple Pay requires HTTPS and domain verification. Only Google Pay may be available in development.');
      console.info('PaymentRequest: Running on localhost - Apple Pay requires production HTTPS domain');
    }

    const pr = stripe.paymentRequest({
      country: 'NL',
      currency: 'eur',
      total: {
        label: 'Add Payment Method',
        amount: 0,
      },
      requestPayerName: true,
      requestPayerEmail: false,
    });

    pr.canMakePayment().then(result => {
      console.log('PaymentRequest.canMakePayment result:', result);

      if (result) {
        // Determine which wallets are available
        const wallets: string[] = [];
        if (result.applePay) wallets.push('Apple Pay');
        if (result.googlePay) wallets.push('Google Pay');

        setAvailableWallets(wallets);
        console.log('Available digital wallets:', wallets);

        setPaymentRequest(pr);
        setCanMakePayment(true);

        // Update warning for localhost if only Google Pay is available
        if (isLocalhost && !result.applePay && result.googlePay) {
          setWarning('Google Pay is available. Apple Pay requires HTTPS domain verification and will only work in production.');
        } else if (isLocalhost && result.applePay) {
          setWarning(null); // Clear warning if somehow Apple Pay is available
        }
      } else {
        console.log('PaymentRequest: No digital wallets available');
        setWarning('No digital wallets (Apple Pay / Google Pay) are available on this device or browser.');
      }
    }).catch(err => {
      console.error('PaymentRequest.canMakePayment error:', err);
      setWarning('Unable to check digital wallet availability. Please use card payment.');
    });

    pr.on('paymentmethod', async (ev) => {
      setLoading(true);
      setError(null);

      try {
        if (ev.paymentMethod?.id) {
          onSuccess(ev.paymentMethod.id);
          ev.complete('success');
        } else {
          throw new Error('No payment method created');
        }
      } catch (err: any) {
        console.error('Payment Request error:', err);
        const errorMessage = err?.message || 'Failed to add payment method';
        setError(errorMessage);
        onError(errorMessage);
        ev.complete('fail');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      pr.abort();
    };
  }, [stripe, elements, onSuccess, onError, setLoading]);

  // Show warning message if wallets not available but no error
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
    <div className="space-y-3">
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
    </div>
  );
}
