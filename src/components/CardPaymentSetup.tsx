import { useState, useRef, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CardPaymentSetupProps {
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  customerName: string;
  customerEmail: string;
}

export default function CardPaymentSetup({
  onSuccess,
  onError,
  customerName,
  customerEmail,
}: CardPaymentSetupProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState(customerName || '');
  const [cardComplete, setCardComplete] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const isMountedRef = useRef(true);
  const processingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Validate cardholder name
  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Cardholder name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (processingRef.current) {
      console.log('[CardPaymentSetup] Already processing, ignoring duplicate submission');
      return;
    }

    console.log('[CardPaymentSetup] Starting payment submission');

    try {
      // Validate Stripe is loaded
      if (!stripe || !elements) {
        const errorMsg = 'Payment system not ready. Please try again.';
        console.error('[CardPaymentSetup] Stripe not ready:', { stripe: !!stripe, elements: !!elements });
        setError(errorMsg);
        onError(errorMsg);
        return;
      }

      // Validate cardholder name
      const nameValidationError = validateName(cardholderName);
      if (nameValidationError) {
        console.log('[CardPaymentSetup] Name validation failed:', nameValidationError);
        setNameError(nameValidationError);
        setError(nameValidationError);
        onError(nameValidationError);
        return;
      }

      // Validate card is complete
      if (!cardComplete) {
        const errorMsg = 'Please complete your card details';
        console.log('[CardPaymentSetup] Card incomplete');
        setError(errorMsg);
        onError(errorMsg);
        return;
      }

      // Set processing state
      processingRef.current = true;
      if (isMountedRef.current) {
        setProcessing(true);
        setError(null);
        setNameError(null);
      }

      console.log('[CardPaymentSetup] Fetching session');

      // Get authentication session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('[CardPaymentSetup] Creating payment intent');

      // Create payment intent with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-methods/card-setup`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerName: cardholderName?.trim() || '',
              customerEmail: customerEmail?.trim() || '',
              amount: 50,
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        console.log('[CardPaymentSetup] Response status:', response.status);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('[CardPaymentSetup] Failed to parse error response:', parseError);
            throw new Error(`Payment setup failed (${response.status})`);
          }
          throw new Error(errorData?.error || errorData?.message || 'Failed to create payment');
        }

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('[CardPaymentSetup] Failed to parse success response:', parseError);
          throw new Error('Invalid response from payment server');
        }

        if (!data?.clientSecret || !data?.paymentMethodId) {
          console.error('[CardPaymentSetup] Invalid response data:', data);
          throw new Error('Invalid response from server. Please try again.');
        }

        console.log('[CardPaymentSetup] Got client secret, confirming payment');

        // Get card element
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found. Please refresh and try again.');
        }

        // Confirm card payment
        const result = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName?.trim() || '',
              email: customerEmail?.trim() || '',
            },
          },
        });

        console.log('[CardPaymentSetup] Payment confirmation result:', {
          status: result.paymentIntent?.status,
          hasError: !!result.error,
        });

        if (result.error) {
          throw new Error(result.error.message || 'Payment failed');
        }

        if (result.paymentIntent?.status !== 'succeeded') {
          throw new Error('Payment was not successful. Please try again.');
        }

        console.log('[CardPaymentSetup] Payment succeeded, calling onSuccess');

        // Success - call onSuccess callback
        if (isMountedRef.current) {
          try {
            onSuccess(data.paymentMethodId);
          } catch (callbackError) {
            console.error('[CardPaymentSetup] onSuccess callback error:', callbackError);
            throw new Error('Payment succeeded but failed to save. Please contact support.');
          }
        }

      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. Please check your connection and try again.');
        }
        throw fetchError;
      }

    } catch (err: any) {
      console.error('[CardPaymentSetup] Error during payment:', err);

      const errorMessage = err?.message || 'Failed to set up card payment. Please try again.';

      if (isMountedRef.current) {
        setError(errorMessage);
      }

      try {
        onError(errorMessage);
      } catch (callbackError) {
        console.error('[CardPaymentSetup] onError callback failed:', callbackError);
      }
    } finally {
      // Always reset processing state
      processingRef.current = false;
      if (isMountedRef.current) {
        setProcessing(false);
      }
      console.log('[CardPaymentSetup] Payment flow completed');
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: '24px',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  };

  // Check if form is valid
  const isFormValid = cardholderName.trim().length >= 2 &&
                      !validateName(cardholderName) &&
                      cardComplete &&
                      stripe &&
                      elements;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>First Payment: €0.50</strong>
          <br />
          This initial charge verifies your card and enables automatic subscription payments.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cardholder Name
          {customerName && (
            <span className="text-xs text-gray-500 ml-2">(from your profile)</span>
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => {
              setCardholderName(e.target.value);
              setNameTouched(true);
              // Real-time validation
              const validationError = validateName(e.target.value);
              setNameError(validationError);
              if (!validationError) {
                setError(null);
              }
            }}
            onBlur={() => setNameTouched(true)}
            placeholder="John Doe"
            className={`w-full px-4 py-3 pr-10 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
              nameTouched && nameError
                ? 'border-red-300 focus:ring-red-500'
                : nameTouched && cardholderName.trim() && !nameError
                ? 'border-green-300 focus:ring-green-500'
                : 'border-gray-300 focus:ring-slate-500'
            }`}
            disabled={processing}
            required
          />
          {nameTouched && cardholderName.trim() && !nameError && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
          {nameTouched && nameError && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
          )}
        </div>
        {nameTouched && nameError && (
          <p className="mt-1 text-xs text-red-600">{nameError}</p>
        )}
        {customerName && !nameTouched && (
          <p className="text-xs text-gray-500 mt-1">
            You can edit this if needed
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        {!stripe ? (
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl">
            <p className="text-sm text-gray-500">Loading payment form...</p>
          </div>
        ) : (
          <div className={`w-full px-4 py-3 bg-white border rounded-xl focus-within:ring-2 focus-within:border-transparent min-h-[44px] transition-all ${
            cardComplete
              ? 'border-green-300 focus-within:ring-green-500'
              : 'border-gray-300 focus-within:ring-slate-500'
          }`}>
            <CardElement
              options={cardElementOptions}
              onReady={() => {
                try {
                  console.log('[CardPaymentSetup] Card element ready');
                  setElementReady(true);
                } catch (err) {
                  console.error('[CardPaymentSetup] Error in onReady:', err);
                }
              }}
              onChange={(e) => {
                try {
                  setCardComplete(e.complete);
                  if (e.error) {
                    console.log('[CardPaymentSetup] Card element error:', e.error.message);
                    setError(e.error.message);
                  } else if (!nameError) {
                    setError(null);
                  }
                } catch (err) {
                  console.error('[CardPaymentSetup] Error in onChange:', err);
                }
              }}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          For testing, use card: 4242 4242 4242 4242
        </p>
      </div>

      {error && !nameError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={processing || !isFormValid}
        className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing Payment...
          </div>
        ) : (
          'Pay €0.50 & Set Up Card'
        )}
      </button>
    </form>
  );
}
