import { useState, useEffect, useRef } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface StripeCardInputProps {
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  initialCardholderName?: string;
}

export default function StripeCardInput({ onSuccess, onError, loading, setLoading, initialCardholderName = '' }: StripeCardInputProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState(initialCardholderName);
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const isMountedRef = useRef(true);
  const processingRef = useRef(false);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update cardholder name when initialCardholderName prop changes
  useEffect(() => {
    if (initialCardholderName && !cardholderName) {
      setCardholderName(initialCardholderName);
      console.log('[StripeCardInput] Cardholder name set from profile:', initialCardholderName);
    }
  }, [initialCardholderName]);

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

  useEffect(() => {
    console.log('🔍 StripeCardInput Status:');
    console.log('  ├─ Stripe instance:', stripe ? '✅ Loaded' : '❌ Not loaded');
    console.log('  ├─ Elements instance:', elements ? '✅ Loaded' : '❌ Not loaded');
    console.log('  └─ Card element ready:', elementReady);

    if (stripe && elements) {
      console.log('✅ All Stripe components ready');
    }

    // Set a timeout to show error if Stripe doesn't load
    const timeout = setTimeout(() => {
      if (!stripe || !elements) {
        const msg = 'Payment form failed to load. Please refresh the page.';
        setError(msg);
        console.error('❌ Stripe initialization timeout');
        console.error('   - Stripe:', stripe);
        console.error('   - Elements:', elements);
        console.error('   - Check browser console for CSP or network errors');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [stripe, elements, elementReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (processingRef.current) {
      console.log('[StripeCardInput] Already processing, ignoring duplicate submission');
      return;
    }

    console.log('[StripeCardInput] Starting card submission');

    if (!stripe || !elements) {
      const errorMsg = 'Stripe has not loaded yet. Please try again.';
      if (isMountedRef.current) {
        setError(errorMsg);
      }
      onError(errorMsg);
      return;
    }

    // Validate cardholder name
    const nameValidationError = validateName(cardholderName);
    if (nameValidationError) {
      if (isMountedRef.current) {
        setNameError(nameValidationError);
        setError(nameValidationError);
      }
      onError(nameValidationError);
      return;
    }

    if (!cardComplete) {
      const errorMsg = 'Please complete your card details';
      if (isMountedRef.current) {
        setError(errorMsg);
      }
      onError(errorMsg);
      return;
    }

    processingRef.current = true;
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
      setNameError(null);
    }

    try {
      console.log('[StripeCardInput] Creating payment method with Stripe');

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element not found. Please refresh the page.');
      }

      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message || 'Failed to process card');
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      console.log('[StripeCardInput] Payment method created successfully:', paymentMethod.id);

      // Only call onSuccess if component is still mounted
      if (isMountedRef.current) {
        try {
          await onSuccess(paymentMethod.id);
        } catch (callbackError) {
          console.error('[StripeCardInput] onSuccess callback error:', callbackError);
          throw callbackError;
        }
      }
    } catch (err: any) {
      console.error('[StripeCardInput] Error:', err);
      const errorMessage = err?.message || 'Failed to add card. Please try again.';

      if (isMountedRef.current) {
        setError(errorMessage);
      }

      try {
        onError(errorMessage);
      } catch (callbackError) {
        console.error('[StripeCardInput] onError callback error:', callbackError);
      }
    } finally {
      processingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
      console.log('[StripeCardInput] Card submission completed');
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cardholder Name
          {initialCardholderName && (
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
            disabled={loading}
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
        {initialCardholderName && !nameTouched && (
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
                console.log('✅ CardElement mounted and ready');
                setElementReady(true);
              }}
              onChange={(e) => {
                console.log('Card input changed:', e.complete ? '✅ Complete' : '⏳ Incomplete', e.error ? `❌ ${e.error.message}` : '');
                setCardComplete(e.complete);
                if (e.error) {
                  setError(e.error.message);
                } else if (!nameError) {
                  setError(null);
                }
              }}
              onBlur={() => console.log('CardElement lost focus')}
              onFocus={() => console.log('CardElement gained focus')}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          For testing, use card number: 4242 4242 4242 4242
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
        disabled={loading || !isFormValid}
        className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding Card...
          </div>
        ) : (
          'Add Card'
        )}
      </button>
    </form>
  );
}
