import { X, CreditCard, Lock, AlertCircle, Plus, Check } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { paymentMethodsAPI, PaymentMethod } from '../services/mobile/paymentMethods';
import { getCountryFromPhoneNumber, isSEPACountry, isBelgium } from '../utils/countryUtils';
import { getStripe } from '../lib/stripe';
import StripeCardInput from './StripeCardInput';
import PaymentRequestButton from './PaymentRequestButton';
import IdealPaymentSetup from './IdealPaymentSetup';
import BancontactPaymentSetup from './BancontactPaymentSetup';
import { useToast } from '../utils/toastContext';

interface ChoosePaymentMethodProps {
  onClose: () => void;
  onPaymentMethodSelected: (paymentMethodId: string) => void;
  title?: string;
  description?: string;
  excludeTypes?: string[];
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

export default function ChoosePaymentMethod({
  onClose,
  onPaymentMethodSelected,
  title = "Choose Payment Method",
  description = "Select or add a payment method",
  excludeTypes = [],
  userProfile
}: ChoosePaymentMethodProps) {
  const [view, setView] = useState<'select' | 'add'>('select');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  // Add payment method states
  const [paymentType, setPaymentType] = useState<'card' | 'ideal' | 'bancontact'>('card');
  const stripePromise = useMemo(() => getStripe(), []); // Memoize to prevent re-initialization
  const [iban, setIban] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [userCountryCode, setUserCountryCode] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [email, setEmail] = useState('');
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

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

    setIsAppleDevice(isIOS || (isMac && isSafari));

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch payment methods
        const response = await paymentMethodsAPI.getPaymentMethods();
        let methods = response.paymentMethods || [];

        // Filter out excluded payment types
        if (excludeTypes.length > 0) {
          methods = methods.filter(m => !excludeTypes.includes(m.type));
        }

        setPaymentMethods(methods);

        // Auto-select primary or first method
        const primary = methods.find(m => m.isPrimary);
        if (primary) {
          setSelectedMethodId(primary.id);
        } else if (methods.length > 0) {
          setSelectedMethodId(methods[0].id);
        }

        // If no payment methods, go directly to add view
        if (methods.length === 0) {
          setView('add');
        }

        // Use userProfile prop for billing details (no API call)
        if (userProfile) {
          console.log('[ChoosePaymentMethod] Using provided userProfile for billing details');
          if (userProfile.full_name) {
            setUserFullName(userProfile.full_name);
            setAccountHolderName(userProfile.full_name);
          }
          if (userProfile.email) {
            setUserEmail(userProfile.email);
            setEmail(userProfile.email);
          }
          if (userProfile.phone_nr) {
            const country = getCountryFromPhoneNumber(userProfile.phone_nr);
            if (country) {
              setUserCountryCode(country.code);
            }
          }
        } else {
          console.warn('[ChoosePaymentMethod] No userProfile provided - billing details unavailable');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setView('add');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectMethod = async () => {
    if (!selectedMethodId) {
      setError('Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      await onPaymentMethodSelected(selectedMethodId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleStripeCardSuccess = async (paymentMethodId: string) => {
    console.log('Stripe payment method created:', paymentMethodId);
    try {
      setProcessing(true);
      await paymentMethodsAPI.savePaymentMethod({
        type: 'card',
        stripePaymentMethodId: paymentMethodId,
        isPrimary: saveCard,
      });

      // Use the newly added payment method
      const response = await paymentMethodsAPI.getPaymentMethods();
      const methods = response.paymentMethods || [];
      const newMethod = methods.find(m => m.stripePaymentMethodId === paymentMethodId);

      if (newMethod) {
        await onPaymentMethodSelected(newMethod.id);
      }

      showSuccess('Payment method added successfully');
      onClose();
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      const errorMsg = err?.message || 'Failed to save payment method. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const handleStripeCardError = (errorMessage: string) => {
    setError(errorMessage);
    showError(errorMessage);
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      if (paymentType === 'bancontact') {
        // Validate required billing details from user profile
        if (!userFullName?.trim()) {
          throw new Error('Your profile name is required for Bancontact. Please complete your profile first.');
        }

        if (!userEmail?.trim()) {
          throw new Error('Your profile email is required for Bancontact. Please complete your profile first.');
        }

        console.log('[ChoosePaymentMethod] Setting up Bancontact payment');
        console.log('[ChoosePaymentMethod] Using profile name:', userFullName);
        console.log('[ChoosePaymentMethod] Using profile email:', userEmail);

        const response = await paymentMethodsAPI.savePaymentMethod({
          type: 'bancontact',
          cardholderName: userFullName.trim(),
          email: userEmail.trim(),
          isPrimary: saveCard,
        });

        if (response.requiresAction && response.clientSecret && response.setupIntentId && response.paymentMethodId) {
          console.log('[ChoosePaymentMethod] Bancontact requires action - triggering redirect flow');
          setBancontactSetupData({
            clientSecret: response.clientSecret,
            setupIntentId: response.setupIntentId,
            paymentMethodId: response.paymentMethodId,
          });
          setProcessing(false);
          return;
        }
      } else if (paymentType === 'ideal') {
        // Validate required billing details from user profile
        if (!userFullName?.trim()) {
          throw new Error('Your profile name is required for iDEAL. Please complete your profile first.');
        }

        if (!userEmail?.trim()) {
          throw new Error('Your profile email is required for iDEAL. Please complete your profile first.');
        }

        console.log('[ChoosePaymentMethod] Setting up iDEAL payment');
        console.log('[ChoosePaymentMethod] Using profile name:', userFullName);
        console.log('[ChoosePaymentMethod] Using profile email:', userEmail);

        const response = await paymentMethodsAPI.savePaymentMethod({
          type: 'ideal',
          cardholderName: userFullName.trim(),
          email: userEmail.trim(),
          isPrimary: saveCard,
        });

        if (response.requiresAction && response.clientSecret && response.setupIntentId && response.paymentMethodId) {
          console.log('[ChoosePaymentMethod] iDEAL requires action - triggering redirect flow');
          setIdealSetupData({
            clientSecret: response.clientSecret,
            setupIntentId: response.setupIntentId,
            paymentMethodId: response.paymentMethodId,
          });
          setProcessing(false);
          return;
        }
      }

      // Refresh payment methods and select the new one
      const response = await paymentMethodsAPI.getPaymentMethods();
      const methods = response.paymentMethods || [];
      const newMethod = methods[methods.length - 1];

      if (newMethod) {
        await onPaymentMethodSelected(newMethod.id);
      }

      onClose();
    } catch (err: any) {
      console.error('Error adding payment method:', err);
      const errorMsg = err?.message || 'Failed to add payment method. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentRequestSuccess = async (stripePaymentMethodId: string) => {
    console.log('Payment Request payment method created:', stripePaymentMethodId);
    console.log('Device detection - isAppleDevice:', isAppleDevice);
    console.log('User Agent:', navigator.userAgent);

    try {
      setProcessing(true);

      // Determine the type based on the payment method details
      const paymentType = isAppleDevice ? 'applepay' : 'googlepay';
      console.log('Saving payment method as type:', paymentType);

      await paymentMethodsAPI.savePaymentMethod({
        type: paymentType,
        stripePaymentMethodId: stripePaymentMethodId,
        isPrimary: true,
      });

      console.log('Payment method saved successfully');

      // Use the newly added payment method
      const response = await paymentMethodsAPI.getPaymentMethods();
      const methods = response.paymentMethods || [];
      const newMethod = methods.find(m => m.stripePaymentMethodId === stripePaymentMethodId);

      console.log('New payment method retrieved:', newMethod);

      if (newMethod) {
        await onPaymentMethodSelected(newMethod.id);
        console.log('Payment method selected:', newMethod.id);
      }

      showSuccess('Payment method added successfully');
      onClose();
    } catch (err: any) {
      console.error('Error saving payment request method:', err);
      const errorMsg = err?.message || 'Failed to save payment method. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentRequestError = (errorMessage: string) => {
    setError(errorMessage);
    showError(errorMessage);
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'ideal':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 576 512">
            <path fill="currentColor" d="M125.61 165.48a49.07 49.07 0 1 0 49.06 49.06a49.08 49.08 0 0 0-49.06-49.06M86.15 425.84h78.94V285.32H86.15Zm151.46-211.6c0-20-10-22.53-18.74-22.53h-14.05v45.79h14.05c9.75 0 18.74-2.81 18.74-23.26m201.69 46v-91.31h22.75v68.57h33.69C486.5 113.08 388.61 86.19 299.67 86.19h-94.83V169h14c25.6 0 41.5 17.35 41.5 45.26c0 28.81-15.52 46-41.5 46h-14v165.62h94.83c144.61 0 194.94-67.16 196.72-165.64Zm-109.75 0H273.3V169h54.43v22.73H296v10.58h30V225h-30v12.5h33.51Zm74.66 0l-5.16-17.67h-29.74l-5.18 17.67h-23.66L368 168.92h32.35l27.53 91.34ZM299.65 32H32v448h267.65c161.85 0 251-79.73 251-224.52C550.62 172 518 32 299.65 32m0 426.92H53.07V53.07h246.58c142.1 0 229.9 64.61 229.9 202.41c0 134.09-81 203.44-229.9 203.44m83.86-264.85L376 219.88h16.4l-7.52-25.81Z"/>
          </svg>
        );
      case 'bancontact':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
            <path fill="currentColor" d="M28.516 13.027h-9.433l-5.723 6.692H2.079l3.041-3.583H1.495c-.823 0-1.495.687-1.495 1.531v3.24c0 .843.672 1.531 1.495 1.531H18.74c.823 0 1.948-.511 2.5-1.14l2.609-2.964l4.624-5.26zm-1.5 1.702l-1 1.14zm3.489-5.166H13.306c-.823 0-1.947.511-2.5 1.135l-7.317 8.281h9.396l5.823-6.692h11.229l-3.016 3.583h3.584c.823 0 1.495-.692 1.495-1.536v-3.235c0-.844-.672-1.536-1.495-1.536m-2.494 4.03l-.5.568l-.131.156z"/>
          </svg>
        );
      case 'sepa_debit':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.553 8.72v6.56h1.766v-1.694h1.052l.293-.01q.868-.013.984-.033q.985-.13 1.3-.994q.16-.436.16-1.434q0-.83-.145-1.243q-.277-.786-1.09-1.04q-.354-.111-1.031-.111zm6.79 0l-1.971 6.56h1.826l.317-1.134h2.36l.337 1.133H24l-1.995-6.558zm-9.339.031a3.36 3.36 0 0 0-1.888.574a3.27 3.27 0 0 0-1.199 1.455h-.742l-.464.996h.969a3 3 0 0 0 .004.526h-.467l-.465.995H6.94a3.33 3.33 0 0 0 3.064 1.973a3.37 3.37 0 0 0 1.876-.564l.013-.009v-1.241l-.05.056a2.293 2.293 0 0 1-3.618-.215h2.396l.465-.995H7.838a2.4 2.4 0 0 1-.012-.526h3.505l.008-.017l.438-.939l.019-.04H8.154a2.31 2.31 0 0 1 1.963-1.108c.694 0 1.344.31 1.783.85l.028.035l.409-.875l-.015-.014a3.36 3.36 0 0 0-2.318-.917m-7.2.004q-.658 0-1.196.048q-.646.051-1.062.348a1.1 1.1 0 0 0-.41.565q-.128.372-.128.99q0 .81.236 1.21q.269.47 1.074.621q.308.052 1.094.109q.981.066 1.098.103q.316.095.316.528a1.1 1.1 0 0 1-.037.315a.48.48 0 0 1-.298.287q-.127.048-.589.048h-.604a1 1 0 0 1-.41-.09q-.246-.121-.246-.549v-.136H0q0 .8.118 1.143q.213.618.879.82q.543.165 1.922.164q.826 0 1.228-.075q.96-.18 1.233-.853q.151-.368.151-1.16q0-.344-.033-.617a1.2 1.2 0 0 0-.355-.74q-.379-.363-1.22-.448q-.265-.028-1.33-.1l-.331-.023a.8.8 0 0 1-.35-.094q-.185-.113-.185-.471q0-.396.208-.514t.852-.118q.661 0 .808.205q.095.138.095.542h1.642q.016-.217.016-.326q0-1.325-1.072-1.613q-.44-.119-1.473-.119zm17.894 1.27l.827 2.843h-1.63zm-6.38.13h1.116q.27 0 .342.01q.36.063.456.345q.067.201.067.617a3 3 0 0 1-.033.512q-.053.258-.21.344q-.114.063-.637.082h-1.1Z"/>
          </svg>
        );
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return `${method.cardBrand || 'Card'} •••• ${method.lastFour}`;
    }
    if (method.type === 'ideal') {
      return 'iDEAL';
    }
    if (method.type === 'sepa_debit') {
      return 'SEPA Direct Debit';
    }
    if (method.type === 'bancontact') {
      return 'Bancontact';
    }
    if (method.type === 'applepay') {
      return 'Apple Pay';
    }
    if (method.type === 'googlepay') {
      return 'Google Pay';
    }
    return method.type;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (bancontactSetupData) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={() => setBancontactSetupData(null)}>
        <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-center">
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
                onSuccess={async () => {
                  try {
                    console.log('[ChoosePaymentMethod] Bancontact setup success');
                    setBancontactSetupData(null);

                    const response = await paymentMethodsAPI.getPaymentMethods();
                    const methods = response.paymentMethods || [];
                    const newMethod = methods[methods.length - 1];

                    if (newMethod) {
                      await onPaymentMethodSelected(newMethod.id);
                    }

                    showSuccess('Payment method added successfully');
                    onClose();
                  } catch (err) {
                    console.error('[ChoosePaymentMethod] Error in Bancontact success callback:', err);
                    showError('Failed to complete Bancontact setup');
                  }
                }}
                onError={(error) => {
                  try {
                    console.error('[ChoosePaymentMethod] Bancontact setup error:', error);
                    setError(error);
                    setBancontactSetupData(null);
                    showError(error);
                  } catch (err) {
                    console.error('[ChoosePaymentMethod] Error in Bancontact error callback:', err);
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={() => setIdealSetupData(null)}>
        <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-center">
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
                onSuccess={async () => {
                  try {
                    console.log('[ChoosePaymentMethod] iDEAL setup success');
                    setIdealSetupData(null);

                    const response = await paymentMethodsAPI.getPaymentMethods();
                    const methods = response.paymentMethods || [];
                    const newMethod = methods[methods.length - 1];

                    if (newMethod) {
                      await onPaymentMethodSelected(newMethod.id);
                    }

                    showSuccess('Payment method added successfully');
                    onClose();
                  } catch (err) {
                    console.error('[ChoosePaymentMethod] Error in iDEAL success callback:', err);
                    showError('Failed to complete iDEAL setup');
                  }
                }}
                onError={(error) => {
                  try {
                    console.error('[ChoosePaymentMethod] iDEAL setup error:', error);
                    setError(error);
                    setIdealSetupData(null);
                    showError(error);
                  } catch (err) {
                    console.error('[ChoosePaymentMethod] Error in iDEAL error callback:', err);
                  }
                }}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-center mb-2">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="px-5 py-5">
          {view === 'select' && (
            <>
              <div className="space-y-3 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethodId(method.id)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      selectedMethodId === method.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        selectedMethodId === method.id ? 'bg-orange-100' : 'bg-gray-100'
                      }`}>
                        {getPaymentMethodIcon(method.type)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">
                          {getPaymentMethodDisplay(method)}
                        </div>
                        {method.cardholderName && (
                          <div className="text-sm text-gray-600">
                            {method.cardholderName}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedMethodId === method.id && (
                      <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setView('add')}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center gap-2 mb-6 text-gray-700 hover:text-gray-900"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add New Payment Method</span>
              </button>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleSelectMethod}
                disabled={processing || !selectedMethodId}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </>
          )}

          {view === 'add' && (
            <form onSubmit={handleAddPaymentMethod}>
              {paymentMethods.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView('select')}
                  className="mb-4 text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                >
                  ← Back to saved methods
                </button>
              )}

              {!excludeTypes.includes('applepay') && !excludeTypes.includes('googlepay') && (
                <div className="mb-6">
                  <Elements stripe={stripePromise}>
                    <PaymentRequestButton
                      onSuccess={handlePaymentRequestSuccess}
                      onError={handlePaymentRequestError}
                      loading={processing}
                      setLoading={setProcessing}
                    />
                  </Elements>
                  <div className="flex items-center gap-4 mt-6 mb-6">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500">or add</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                </div>
              )}

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
                  <Elements
                    stripe={stripePromise}
                    options={{
                      appearance: {
                        theme: 'stripe',
                      },
                      loader: 'auto',
                    }}
                  >
                    <StripeCardInput
                      onSuccess={handleStripeCardSuccess}
                      onError={handleStripeCardError}
                      loading={processing}
                      setLoading={setProcessing}
                      initialCardholderName={userFullName}
                    />
                  </Elements>
                </div>
              )}

              {paymentType === 'ideal' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={userFullName}
                      onChange={(e) => setUserFullName(e.target.value)}
                      placeholder="Enter cardholder name..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    />
                  </div>
                </div>
              )}

              {paymentType === 'bancontact' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={userFullName}
                      onChange={(e) => setUserFullName(e.target.value)}
                      placeholder="Enter cardholder name..."
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
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      'Add & Continue'
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                    <Lock className="w-3 h-3" />
                    <span>Your payment information is secure and encrypted</span>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
