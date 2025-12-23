import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { paymentMethodsAPI, profileAPI } from '../services/mobile';
import { getCountryFromPhoneNumber, isSEPACountry, isBelgium } from '../utils/countryUtils';
import { getStripe } from '../lib/stripe';
import StripeCardInput from './StripeCardInput';
import PaymentRequestButton from './PaymentRequestButton';
import IdealPaymentSetup from './IdealPaymentSetup';
import BancontactPaymentSetup from './BancontactPaymentSetup';
import CardPaymentSetup from './CardPaymentSetup';
import PaymentRequestSetup from './PaymentRequestSetup';
import { useToast } from '../utils/toastContext';

interface AddCardModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

export default function AddCardModal({ onClose, onSuccess, userProfile }: AddCardModalProps) {
  const [paymentType, setPaymentType] = useState<'card' | 'ideal' | 'bancontact'>('card');
  const [stripePromise] = useState(() => {
    try {
      console.log('[AddCardModal] Initializing Stripe');
      return getStripe();
    } catch (err) {
      console.error('[AddCardModal] Failed to initialize Stripe:', err);
      return Promise.resolve(null);
    }
  });
  const [saveCard, setSaveCard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCountryCode, setUserCountryCode] = useState<string | null>(null);
  const [showBancontact, setShowBancontact] = useState(false);
  const [showIdeal, setShowIdeal] = useState(false);
  const [userFullName, setUserFullName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [idealSetupData, setIdealSetupData] = useState<{
    clientSecret: string;
    setupIntentId: string;
    paymentMethodId: string;
  } | null>(null);
  const [bancontactSetupData, setBancontactSetupData] = useState<{
    clientSecret: string;
    setupIntentId: string;
    paymentMethodId: string;
  } | null>(null);
  const [cardSetupData, setCardSetupData] = useState<{
    paymentMethodId: string;
  } | null>(null);
  const [paymentRequestSetupData, setPaymentRequestSetupData] = useState<{
    paymentMethodId: string;
  } | null>(null);

  const { showSuccess, showError } = useToast();
  const isMountedRef = useRef(true);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    console.log('[AddCardModal] Component mounted');
    return () => {
      isMountedRef.current = false;
      console.log('[AddCardModal] Component unmounting');
    };
  }, []);

  // Initialize billing details immediately from userProfile prop (no API call)
  useEffect(() => {
    console.log('[AddCardModal] Initializing billing details from userProfile');

    if (userProfile) {
      console.log('[AddCardModal] Using provided userProfile:', {
        hasName: !!userProfile.full_name,
        hasEmail: !!userProfile.email,
        hasPhone: !!userProfile.phone_nr
      });

      // Set billing details immediately
      if (userProfile.full_name) {
        setUserFullName(userProfile.full_name);
        setAccountHolderName(userProfile.full_name);
        console.log('[AddCardModal] ✓ Name set:', userProfile.full_name);
      }

      if (userProfile.email) {
        setUserEmail(userProfile.email);
        setEmail(userProfile.email);
        console.log('[AddCardModal] ✓ Email set:', userProfile.email);
      }

      if (userProfile.phone_nr) {
        const country = getCountryFromPhoneNumber(userProfile.phone_nr);
        if (country) {
          setUserCountryCode(country.code);
          console.log('[AddCardModal] ✓ Country set:', country.code);
        }
      }

      // Always show all payment methods
      setShowBancontact(true);
      setShowIdeal(true);

      console.log('[AddCardModal] ✓ Billing details ready instantly');
    } else {
      console.warn('[AddCardModal] No userProfile provided, attempting fallback fetch');
      // Fallback: fetch profile if not provided (backwards compatibility)
      profileAPI.getProfile()
        .then(profile => {
          if (profile?.full_name) {
            setUserFullName(profile.full_name);
            setAccountHolderName(profile.full_name);
          }
          if (profile?.email) {
            setUserEmail(profile.email);
            setEmail(profile.email);
          }
          if (profile?.phone) {
            const country = getCountryFromPhoneNumber(profile.phone);
            if (country) {
              setUserCountryCode(country.code);
              setShowBancontact(true);
              setShowIdeal(true);
            }
          }
        })
        .catch(err => {
          console.error('[AddCardModal] Fallback profile fetch failed:', err);
        });
    }
  }, [userProfile]);

  const handleStripeCardSuccess = async (paymentMethodId: string) => {
    console.log('[AddCardModal] Stripe payment method created:', paymentMethodId);

    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.warn('[AddCardModal] Component unmounted, skipping save');
      return;
    }

    // Prevent processing if modal is closing
    if (!loading && isMountedRef.current) {
      setLoading(true);
    }

    try {
      if (!paymentMethodId) {
        throw new Error('Invalid payment method ID');
      }

      console.log('[AddCardModal] Saving payment method to database');

      const savedMethod = await paymentMethodsAPI.savePaymentMethod({
        type: 'card',
        stripePaymentMethodId: paymentMethodId,
        isPrimary: saveCard,
      });

      console.log('[AddCardModal] Payment method saved successfully:', savedMethod);

      // Check mount status before updating UI
      if (!isMountedRef.current) {
        console.warn('[AddCardModal] Component unmounted after save, skipping UI updates');
        return;
      }

      // Show success message first
      try {
        showSuccess('Payment method added successfully');
      } catch (toastError) {
        console.error('[AddCardModal] Toast error:', toastError);
      }

      // Small delay to ensure user sees success message
      await new Promise(resolve => setTimeout(resolve, 300));

      // Final mount check before callbacks
      if (!isMountedRef.current) {
        console.warn('[AddCardModal] Component unmounted before callbacks');
        return;
      }

      // Safely call callbacks
      try {
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } catch (callbackError) {
        console.error('[AddCardModal] onSuccess callback error:', callbackError);
      }

      // Close modal
      try {
        if (typeof onClose === 'function') {
          onClose();
        }
      } catch (callbackError) {
        console.error('[AddCardModal] onClose callback error:', callbackError);
      }
    } catch (err: any) {
      console.error('[AddCardModal] Error saving payment method:', err);

      if (!isMountedRef.current) {
        console.warn('[AddCardModal] Component unmounted during error handling');
        return;
      }

      const errorMsg = err?.message || 'Failed to save payment method. Please try again.';

      try {
        setError(errorMsg);
        showError(errorMsg);
        setCardSetupData(null);
        setLoading(false);
      } catch (stateError) {
        console.error('[AddCardModal] Error updating state:', stateError);
      }
    }
  };

  const handleStripeCardError = (errorMessage: string) => {
    console.error('[AddCardModal] Card setup error:', errorMessage);
    setError(errorMessage);
    showError(errorMessage);
    setCardSetupData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[AddCardModal] Form submitted for payment type:', paymentType);

    // Prevent double submission
    if (loading) {
      console.log('[AddCardModal] Already loading, ignoring submission');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (paymentType === 'card') {
        if (!accountHolderName?.trim()) {
          throw new Error('Please enter the cardholder name.');
        }

        console.log('[AddCardModal] Opening card setup modal');
        setCardSetupData({
          paymentMethodId: 'temp',
        });
      } else if (paymentType === 'bancontact') {
        // Validate required billing details from user profile
        if (!userFullName?.trim()) {
          throw new Error('Your profile name is required for Bancontact. Please complete your profile first.');
        }

        if (!userEmail?.trim()) {
          throw new Error('Your profile email is required for Bancontact. Please complete your profile first.');
        }

        console.log('[AddCardModal] Setting up Bancontact payment');
        console.log('[AddCardModal] Using profile name:', userFullName);
        console.log('[AddCardModal] Using profile email:', userEmail);

        const response = await paymentMethodsAPI.savePaymentMethod({
          type: paymentType,
          cardholderName: userFullName.trim(),
          isPrimary: saveCard,
        });

        if (!response) {
          throw new Error('No response from server');
        }

        if (response.requiresAction && response.clientSecret && response.setupIntentId && response.paymentMethodId) {
          console.log('[AddCardModal] Bancontact requires action');
          setBancontactSetupData({
            clientSecret: response.clientSecret,
            setupIntentId: response.setupIntentId,
            paymentMethodId: response.paymentMethodId,
          });
        } else {
          throw new Error('Failed to initialize Bancontact setup');
        }
      } else if (paymentType === 'ideal') {
        // Validate required billing details from user profile
        if (!userFullName?.trim()) {
          throw new Error('Your profile name is required for iDEAL. Please complete your profile first.');
        }

        if (!userEmail?.trim()) {
          throw new Error('Your profile email is required for iDEAL. Please complete your profile first.');
        }

        console.log('[AddCardModal] Setting up iDEAL payment');
        console.log('[AddCardModal] Using profile name:', userFullName);
        console.log('[AddCardModal] Using profile email:', userEmail);

        const response = await paymentMethodsAPI.savePaymentMethod({
          type: paymentType,
          cardholderName: userFullName.trim(),
          isPrimary: saveCard,
        });

        if (!response) {
          throw new Error('No response from server');
        }

        if (response.requiresAction && response.clientSecret && response.setupIntentId && response.paymentMethodId) {
          console.log('[AddCardModal] iDEAL requires action');
          setIdealSetupData({
            clientSecret: response.clientSecret,
            setupIntentId: response.setupIntentId,
            paymentMethodId: response.paymentMethodId,
          });
        } else {
          console.log('[AddCardModal] iDEAL setup complete');
          try {
            onSuccess();
            onClose();
          } catch (callbackErr) {
            console.error('[AddCardModal] Error in callbacks:', callbackErr);
          }
        }
      }
    } catch (err: any) {
      console.error('[AddCardModal] Error adding payment method:', err);
      const errorMsg = err?.message || 'Failed to add payment method. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleIdealSetupSuccess = () => {
    try {
      console.log('[AddCardModal] iDEAL setup success');
      showSuccess('Payment method added successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[AddCardModal] Error in iDEAL success callback:', err);
      showError('Failed to complete iDEAL setup');
    }
  };

  const handleIdealSetupError = (errorMessage: string) => {
    try {
      console.error('[AddCardModal] iDEAL setup error:', errorMessage);
      setError(errorMessage);
      showError(errorMessage);
      setIdealSetupData(null);
    } catch (err) {
      console.error('[AddCardModal] Error in iDEAL error callback:', err);
    }
  };

  const handlePaymentRequestSuccess = async (paymentMethodId: string) => {
    try {
      console.log('[AddCardModal] Payment request success');
      if (!accountHolderName?.trim()) {
        const errorMsg = 'Please enter your name to continue.';
        setError(errorMsg);
        showError(errorMsg);
        return;
      }

      setPaymentRequestSetupData({
        paymentMethodId: 'temp',
      });
    } catch (err) {
      console.error('[AddCardModal] Error in payment request success:', err);
      showError('Failed to process payment request');
    }
  };

  const handlePaymentRequestError = (errorMessage: string) => {
    try {
      console.error('[AddCardModal] Payment request error:', errorMessage);
      setError(errorMessage);
      showError(errorMessage);
    } catch (err) {
      console.error('[AddCardModal] Error in payment request error callback:', err);
    }
  };

  if (paymentRequestSetupData) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] flex items-end" onClick={onClose}>
        <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex flex-col items-center mb-2">
              <h2 className="text-xl font-bold text-gray-900">Apple Pay / Google Pay</h2>
              <p className="text-sm text-gray-600 mt-2">
                Complete your first payment and we'll set up automatic payments
              </p>
            </div>
          </div>

          <div className="px-5 py-5">
            <Elements stripe={stripePromise}>
              <PaymentRequestSetup
                customerName={accountHolderName}
                customerEmail={email}
                onSuccess={(pmId) => {
                  try {
                    console.log('[AddCardModal] Payment request success, closing modals');
                    setPaymentRequestSetupData(null);
                    showSuccess('Payment method added successfully');
                    onSuccess();
                    onClose();
                  } catch (err) {
                    console.error('[AddCardModal] Error in payment request success callback:', err);
                    showError('Failed to complete payment setup');
                  }
                }}
                onError={(error) => {
                  try {
                    console.error('[AddCardModal] Payment request error:', error);
                    setError(error);
                    showError(error);
                    setPaymentRequestSetupData(null);
                  } catch (err) {
                    console.error('[AddCardModal] Error in payment request error callback:', err);
                  }
                }}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  if (cardSetupData) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] flex items-end" onClick={onClose}>
        <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex flex-col items-center mb-2">
              <h2 className="text-xl font-bold text-gray-900">Add Card</h2>
              <p className="text-sm text-gray-600 mt-2">
                Complete your first payment and we'll set up automatic payments
              </p>
            </div>
          </div>

          <div className="px-5 py-5">
            <Elements stripe={stripePromise}>
              <CardPaymentSetup
                customerName={accountHolderName}
                customerEmail={email}
                onSuccess={(pmId) => {
                  try {
                    console.log('[AddCardModal] Card setup success, closing modals');
                    setCardSetupData(null);
                    showSuccess('Payment method added successfully');
                    onSuccess();
                    onClose();
                  } catch (err) {
                    console.error('[AddCardModal] Error in success callback:', err);
                    showError('Failed to complete card setup');
                  }
                }}
                onError={(error) => {
                  try {
                    console.error('[AddCardModal] Card setup error:', error);
                    setError(error);
                    showError(error);
                    setCardSetupData(null);
                  } catch (err) {
                    console.error('[AddCardModal] Error in error callback:', err);
                  }
                }}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  if (bancontactSetupData) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] flex items-end" onClick={() => setBancontactSetupData(null)}>
        <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-center mb-2">
              <h2 className="text-xl font-bold text-gray-900">Complete via Bancontact</h2>
            </div>
          </div>

          <div className="px-5 py-5">
            <Elements stripe={stripePromise}>
              <BancontactPaymentSetup
                clientSecret={bancontactSetupData.clientSecret}
                setupIntentId={bancontactSetupData.setupIntentId}
                paymentMethodId={bancontactSetupData.paymentMethodId}
                customerName={userFullName}
                customerEmail={userEmail}
                onSuccess={() => {
                  try {
                    console.log('[AddCardModal] Bancontact setup success');
                    setBancontactSetupData(null);
                    showSuccess('Payment method added successfully');
                    onSuccess();
                    onClose();
                  } catch (err) {
                    console.error('[AddCardModal] Error in Bancontact success callback:', err);
                    showError('Failed to complete Bancontact setup');
                  }
                }}
                onError={(error) => {
                  try {
                    console.error('[AddCardModal] Bancontact setup error:', error);
                    setError(error);
                    showError(error);
                    setBancontactSetupData(null);
                  } catch (err) {
                    console.error('[AddCardModal] Error in Bancontact error callback:', err);
                  }
                }}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  if (idealSetupData) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] flex items-end" onClick={() => setIdealSetupData(null)}>
        <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-center mb-2">
              <h2 className="text-xl font-bold text-gray-900">Complete via iDEAL</h2>
            </div>
          </div>

          <div className="px-5 py-5">
            <Elements stripe={stripePromise}>
              <IdealPaymentSetup
                clientSecret={idealSetupData.clientSecret}
                setupIntentId={idealSetupData.setupIntentId}
                paymentMethodId={idealSetupData.paymentMethodId}
                customerName={userFullName}
                customerEmail={userEmail}
                onSuccess={handleIdealSetupSuccess}
                onError={handleIdealSetupError}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-center mb-2">
            <h2 className="text-xl font-bold text-gray-900">Add Payment Method</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <Elements stripe={stripePromise}>
            <PaymentRequestButton
              onSuccess={handlePaymentRequestSuccess}
              onError={handlePaymentRequestError}
              loading={loading}
              setLoading={setLoading}
            />
          </Elements>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">or add</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setPaymentType('card')}
              className={`py-3 rounded-xl font-medium transition-all ${
                paymentType === 'card'
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Card</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType('ideal')}
              className={`py-3 rounded-xl font-medium transition-all ${
                paymentType === 'ideal'
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 576 512">
                    <path fill="currentColor" d="M125.61 165.48a49.07 49.07 0 1 0 49.06 49.06a49.08 49.08 0 0 0-49.06-49.06M86.15 425.84h78.94V285.32H86.15Zm151.46-211.6c0-20-10-22.53-18.74-22.53h-14.05v45.79h14.05c9.75 0 18.74-2.81 18.74-23.26m201.69 46v-91.31h22.75v68.57h33.69C486.5 113.08 388.61 86.19 299.67 86.19h-94.83V169h14c25.6 0 41.5 17.35 41.5 45.26c0 28.81-15.52 46-41.5 46h-14v165.62h94.83c144.61 0 194.94-67.16 196.72-165.64Zm-109.75 0H273.3V169h54.43v22.73H296v10.58h30V225h-30v12.5h33.51Zm74.66 0l-5.16-17.67h-29.74l-5.18 17.67h-23.66L368 168.92h32.35l27.53 91.34ZM299.65 32H32v448h267.65c161.85 0 251-79.73 251-224.52C550.62 172 518 32 299.65 32m0 426.92H53.07V53.07h246.58c142.1 0 229.9 64.61 229.9 202.41c0 134.09-81 203.44-229.9 203.44m83.86-264.85L376 219.88h16.4l-7.52-25.81Z"/>
                  </svg>
                </div>
                <span className="text-xs">iDEAL</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType('bancontact')}
              className={`py-3 rounded-xl font-medium transition-all ${
                paymentType === 'bancontact'
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
                    <path fill="currentColor" d="M28.516 13.027h-9.433l-5.723 6.692H2.079l3.041-3.583H1.495c-.823 0-1.495.687-1.495 1.531v3.24c0 .843.672 1.531 1.495 1.531H18.74c.823 0 1.948-.511 2.5-1.14l2.609-2.964l4.624-5.26zm-1.5 1.702l-1 1.14zm3.489-5.166H13.306c-.823 0-1.947.511-2.5 1.135l-7.317 8.281h9.396l5.823-6.692h11.229l-3.016 3.583h3.584c.823 0 1.495-.692 1.495-1.536v-3.235c0-.844-.672-1.536-1.495-1.536m-2.494 4.03l-.5.568l-.131.156z"/>
                  </svg>
                </div>
                <span className="text-xs">Bancontact</span>
              </div>
            </button>
          </div>

          {paymentType === 'card' && (
            <div className="mb-6">
              <Elements stripe={stripePromise}>
                <StripeCardInput
                  onSuccess={handleStripeCardSuccess}
                  onError={handleStripeCardError}
                  loading={loading}
                  setLoading={setLoading}
                  initialCardholderName={accountHolderName}
                />
              </Elements>
            </div>
          )}

          {paymentType === 'ideal' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="Enter account holder name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
            </div>
          )}

          {paymentType === 'bancontact' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="Enter account holder name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
            </div>
          )}

          {paymentType !== 'card' && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-2 mb-6">
                <input
                  type="checkbox"
                  id="saveCard"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="w-4 h-4 text-slate-700 border-gray-300 rounded focus:ring-slate-500"
                />
                <label htmlFor="saveCard" className="text-sm text-gray-700">
                  Set as primary payment method
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </div>
                ) : (
                  'Add Payment Method'
                )}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
