import { useState, useEffect, useRef } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { AlertCircle } from 'lucide-react';

interface IdealPaymentSetupProps {
  clientSecret: string;
  setupIntentId: string;
  paymentMethodId: string;
  customerName: string;
  customerEmail: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface PaymentMessages {
  confirmation_title: string;
  confirmation_subtitle: string;
  redirecting_text: string;
}

export default function IdealPaymentSetup({
  clientSecret,
  setupIntentId,
  paymentMethodId,
  customerName,
  customerEmail,
  onSuccess,
  onError
}: IdealPaymentSetupProps) {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [messages, setMessages] = useState<PaymentMessages>({
    confirmation_title: 'Confirm with Ideal.',
    confirmation_subtitle: "You'll be redirected to your bank to complete.",
    redirecting_text: 'Redirecting to your bank...'
  });
  const hasConfirmedRef = useRef(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/payment-method-messages?type=ideal&language=en`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('[IdealPaymentSetup] Error fetching messages:', err);
      }
    };

    fetchMessages();
  }, []);

  useEffect(() => {
    // Prevent double execution
    if (!stripe || redirecting || hasConfirmedRef.current) return;

    const confirmSetup = async () => {
      try {
        // Validate required billing details
        if (!customerName?.trim()) {
          const errorMsg = 'Customer name is required for iDEAL payment setup';
          console.error('[IdealPaymentSetup]', errorMsg);
          setError(errorMsg);
          onError(errorMsg);
          return;
        }

        if (!customerEmail?.trim()) {
          const errorMsg = 'Customer email is required for iDEAL payment setup';
          console.error('[IdealPaymentSetup]', errorMsg);
          setError(errorMsg);
          onError(errorMsg);
          return;
        }

        // Mark as confirmed to prevent double execution
        hasConfirmedRef.current = true;
        setRedirecting(true);
        setLoading(true);

        console.log('[IdealPaymentSetup] Starting iDEAL setup confirmation');
        console.log('[IdealPaymentSetup] Setup Intent ID:', setupIntentId);
        console.log('[IdealPaymentSetup] Payment Method ID:', paymentMethodId);
        console.log('[IdealPaymentSetup] Customer Name:', customerName);
        console.log('[IdealPaymentSetup] Customer Email:', customerEmail);

        // Build confirm params with required billing details
        const confirmParams = {
          return_url: `${window.location.origin}/?payment_setup_complete=${paymentMethodId}&setup_intent=${setupIntentId}`,
          payment_method_data: {
            type: 'ideal' as const,
            billing_details: {
              name: customerName.trim(),
              email: customerEmail.trim(),
            }
          }
        };

        console.log('[IdealPaymentSetup] Confirming setup with billing details:', {
          name: confirmParams.payment_method_data.billing_details.name,
          email: confirmParams.payment_method_data.billing_details.email,
        });

        const result = await stripe.confirmSetup({
          clientSecret,
          confirmParams,
        });

        if (result.error) {
          console.error('[IdealPaymentSetup] Setup confirmation error:', result.error);
          throw new Error(result.error.message || 'Failed to confirm iDEAL setup');
        }

        console.log('[IdealPaymentSetup] Setup initiated successfully, redirecting to bank');
      } catch (err: any) {
        console.error('[IdealPaymentSetup] Error during setup:', err);
        const errorMessage = err?.message || 'Failed to set up iDEAL. Please try again.';
        setError(errorMessage);
        onError(errorMessage);
        setLoading(false);
        setRedirecting(false);
        hasConfirmedRef.current = false;
      }
    };

    confirmSetup();
  }, [stripe, clientSecret, paymentMethodId, setupIntentId, customerName, customerEmail, onError, redirecting]);

  return (
    <div className="space-y-4">
      {!error && (
        <>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-center text-gray-600 text-sm">
              {messages.redirecting_text}
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900 mb-1">Setup Failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
