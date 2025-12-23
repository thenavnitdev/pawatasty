import { ChevronLeft, Check, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import MembersNoteModal from './MembersNoteModal';
import ChoosePaymentMethod from './ChoosePaymentMethod';
import { subscriptionsEdgeAPI } from '../services/mobile/subscriptionsEdge';
import { paymentMethodsAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';
import { supabase } from '../lib/supabase';

type PlanType = 'flex' | 'gold' | 'silver';

interface Plan {
  id: PlanType;
  name: string;
  displayName: string;
  subtitle: string;
  price: number;
  period: string;
  annualPrice?: number;
  features: Array<{
    text: string;
    badge?: string;
  }>;
  billingNote: string;
  badge?: string;
  color: 'blue' | 'orange' | 'teal';
}

interface MembershipPlansProps {
  onBack: () => void;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

export default function MembershipPlans({ onBack, userProfile }: MembershipPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('gold');
  const [showMembersNote, setShowMembersNote] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [backendPlans, setBackendPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [currentUserLevel, setCurrentUserLevel] = useState<string>('');
  const [currentUserSubscription, setCurrentUserSubscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const planRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        const [plans, userDataResponse] = await Promise.all([
          subscriptionsEdgeAPI.getPlans(),
          user ? supabase
            .from('users')
            .select('current_level, subscription')
            .eq('user_id', user.id)
            .maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);

        if (!plans || plans.length === 0) {
          throw new Error('No membership plans available');
        }

        setBackendPlans(plans);

        const userData = userDataResponse?.data;
        if (userData) {
          setCurrentUserLevel((userData.current_level || 1).toString());
          setCurrentUserSubscription(userData.subscription || 'flex');
        } else {
          setCurrentUserLevel('1');
          setCurrentUserSubscription('flex');
        }

        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching membership data:', error);
        setError(error.message || 'Unable to load membership plans. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle return from iDeal/PayPal redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentParam = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    if (paymentIntentParam && paymentIntentClientSecret) {
      console.log('🔄 Detected redirect return from Stripe payment');
      console.log('Payment Intent ID:', paymentIntentParam);

      // Call the backend to verify and complete the payment
      handleRedirectReturn(paymentIntentParam);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleRedirectReturn = async (paymentIntentId: string) => {
    try {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Not authenticated');
      }

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-payment/verify?payment_intent=${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const result = await response.json();

      if (result.status === 'succeeded' && result.paymentMethodId) {
        const confirmResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-payment/confirm`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntentId,
              paymentMethodId: result.paymentMethodId,
            }),
          }
        );

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm payment');
        }

        handlePaymentSuccess();
      } else {
        throw new Error(`Payment not completed. Status: ${result.status}`);
      }
    } catch (error) {
      console.error('Error handling redirect return:', error);
      setError('Payment verification failed. Please contact support if you were charged.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowSuccessModal(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('current_level, subscription')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setCurrentUserLevel((profileData.current_level || 1).toString());
          setCurrentUserSubscription(profileData.subscription || 'flex');
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }

    setTimeout(() => {
      setShowSuccessModal(false);
      onBack();
    }, 3000);
  };

  const handleUpgradeClick = async () => {
    setError(null);

    const selectedPlanBackend = backendPlans.find(p =>
      (p.tier || p.name.toLowerCase()).includes(selectedPlan)
    );

    if (!selectedPlanBackend) {
      setError('Selected plan not found');
      return;
    }

    // Check if downgrading to Flex plan (free)
    if (selectedPlan === 'flex') {
      setProcessingPayment(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Call backend without payment method for Flex
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscriptions`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tier: 'flex',
              paymentMethodId: null,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to downgrade to Flex plan');
        }

        await response.json();
        handlePaymentSuccess();
      } catch (error: any) {
        setError(error.message || 'Failed to downgrade to Flex plan. Please try again.');
        setProcessingPayment(false);
      }
      return;
    }

    // For paid plans, show payment method modal
    setProcessingPayment(true);

    try {
      const methods = await paymentMethodsAPI.getPaymentMethods();
      setPaymentMethods(methods.paymentMethods || []);

      // Open payment method modal regardless of whether methods exist
      // The modal will automatically show the "add payment method" form if no methods exist
      setProcessingPayment(false);
      setShowPaymentMethodModal(true);
    } catch (error) {
      setError('Unable to load payment methods. Please try again.');
      setProcessingPayment(false);
    }
  };

  const processPaymentWithMethod = async (paymentMethodId: string, plan: any) => {
    try {
      setProcessingPayment(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const tier = plan.tier || (plan.name.toLowerCase().includes('flex') ? 'flex'
        : plan.name.toLowerCase().includes('gold') ? 'gold'
        : plan.name.toLowerCase().includes('silver') ? 'silver'
        : 'flex');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscriptions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tier: tier,
            paymentMethodId: paymentMethodId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upgrade subscription');
      }

      await response.json();
      handlePaymentSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to upgrade subscription. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentMethodSelected = async (paymentMethodId: string) => {
    setShowPaymentMethodModal(false);

    const selectedPlanBackend = backendPlans.find(p =>
      (p.tier || p.name.toLowerCase()).includes(selectedPlan)
    );

    if (selectedPlanBackend) {
      await processPaymentWithMethod(paymentMethodId, selectedPlanBackend);
    }
  };

  const getPlansFromBackend = (): Plan[] => {
    return backendPlans.map(plan => {
      const planType = (plan.tier ||
        (plan.name.toLowerCase().includes('flex') ? 'flex'
        : plan.name.toLowerCase().includes('gold') ? 'gold'
        : 'silver')) as PlanType;

      const price = parseFloat(plan.price);
      const isYearly = plan.type === 'year';
      const monthlyEquivalent = isYearly ? Math.round((price / 12) * 100) / 100 : price;

      const features: Array<{ text: string; badge?: string }> = Array.isArray(plan.features)
        ? plan.features.map(f => ({ text: f }))
        : [];

      const colorMap = { flex: 'blue', silver: 'teal', gold: 'orange' } as const;

      return {
        id: planType,
        name: plan.name,
        displayName: plan.name,
        subtitle: planType === 'flex' ? `€ ${price}/Flex` : isYearly ? 'Yearly plan' : 'Monthly plan',
        price: monthlyEquivalent,
        period: planType === 'flex' ? '/Flex' : '/Month',
        annualPrice: isYearly ? price : undefined,
        features,
        billingNote: planType === 'flex'
          ? '(Billed by minutes)'
          : isYearly
            ? `(Billed annually: €${price}/year)`
            : `Billed: €${price}/monthly (€${Math.round(price * 12 * 100) / 100} a year)`,
        badge: planType === 'gold' ? 'Best Value' : undefined,
        color: colorMap[planType],
      };
    });
  };

  const plans = getPlansFromBackend();

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const handlePlanClick = (planId: PlanType) => {
    setSelectedPlan(planId);

    const scrollContainer = scrollContainerRef.current;
    const planElement = planRefs.current[planId];

    if (scrollContainer && planElement) {
      const containerWidth = scrollContainer.clientWidth;
      const planLeft = planElement.offsetLeft;
      const planWidth = planElement.offsetWidth;

      const scrollTo = planLeft - (containerWidth / 2) + (planWidth / 2);

      scrollContainer.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  const getPlanColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: {
        bg: isSelected ? 'bg-blue-100 border-blue-300' : 'bg-blue-50 border-blue-100',
        text: 'text-blue-800',
        check: 'bg-green-500',
      },
      orange: {
        bg: isSelected ? 'bg-orange-200 border-orange-300' : 'bg-orange-100 border-orange-200',
        text: 'text-orange-600',
        check: 'bg-orange-500',
        badge: 'bg-orange-500',
      },
      teal: {
        bg: isSelected ? 'bg-teal-100 border-teal-300' : 'bg-teal-50 border-teal-100',
        text: 'text-teal-800',
        check: 'bg-teal-500',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedPlan === 'flex' ? 'Plan Changed!' : 'Membership Upgraded!'}
          </h2>
          <p className="text-gray-600">
            {selectedPlan === 'flex'
              ? `You have successfully switched to the ${selectedPlanData?.displayName}.`
              : `Your ${selectedPlanData?.displayName} is now active.`
            }
          </p>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="min-h-full w-full max-w-md mx-auto">
            <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
                <h1 className="text-lg font-semibold text-gray-800">Membership Plans</h1>
                <div className="w-10" />
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-gray-600 mx-auto">
                <span className="text-sm">Loading plans...</span>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 rounded-2xl border-2 border-gray-200 p-4 animate-pulse"
                    style={{ minWidth: '160px' }}
                  >
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-32 mb-8"></div>
                <div className="h-12 bg-gray-200 rounded w-40 mb-8"></div>
                <div className="space-y-4 mb-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-200"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
                <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || backendPlans.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Plans</h3>
          <p className="text-gray-600 mb-6">{error || 'No membership plans available'}</p>
          <div className="flex flex-col gap-3">
            {error?.toLowerCase().includes('payment') && (
              <button
                onClick={() => {
                  setError(null);
                  setShowPaymentMethodModal(true);
                }}
                className="bg-orange-400 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-500 transition-colors"
              >
                Add Payment Method
              </button>
            )}
            <button
              onClick={onBack}
              className={`${error?.toLowerCase().includes('payment') ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-orange-400 text-white hover:bg-orange-500'} px-6 py-3 rounded-xl font-medium transition-colors`}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto">
          <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <h1 className="text-lg font-semibold text-gray-800">Membership Plans</h1>
              <div className="w-10" />
            </div>

            <button
              onClick={() => setShowMembersNote(true)}
              className="flex items-center justify-center gap-2 mt-4 text-gray-600 hover:text-gray-800 transition-colors mx-auto"
            >
              <span className="text-sm">Select a plan to start</span>
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5">
            <div
              ref={scrollContainerRef}
              className="flex gap-3 mb-6 overflow-x-auto pb-2 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const colors = getPlanColorClasses(plan.color, isSelected);

                return (
                  <button
                    key={plan.id}
                    ref={(el) => (planRefs.current[plan.id] = el)}
                    onClick={() => handlePlanClick(plan.id)}
                    className={`flex-shrink-0 rounded-2xl border-2 p-4 transition-all relative ${colors.bg}`}
                    style={{ minWidth: '160px' }}
                  >
                    {plan.id === 'gold' && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        Best Valued
                      </div>
                    )}

                    <div className="text-left">
                      <div className={`font-bold text-base ${colors.text}`}>
                        {plan.name}
                      </div>
                      <div className={`text-xs ${colors.text} opacity-80`}>
                        {plan.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPlanData && (
              <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col min-h-[calc(100vh-240px)]">
                <div className="flex items-start justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedPlanData.displayName}
                  </h2>
                  {selectedPlanData.badge && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                      {selectedPlanData.badge}
                    </span>
                  )}
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-800">
                      €{selectedPlanData.price}
                    </span>
                    <span className="text-gray-600 text-lg">
                      {selectedPlanData.period}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {selectedPlanData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-700 flex-1">{feature.text}</span>
                      {feature.badge && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <p className="text-sm text-gray-500 mb-8">
                    {selectedPlanData.billingNote}
                  </p>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleUpgradeClick}
                    disabled={processingPayment || currentUserSubscription.toLowerCase() === selectedPlan}
                    className={`w-full font-semibold py-4 rounded-[1rem] transition-all ${
                      currentUserSubscription.toLowerCase() === selectedPlan
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : processingPayment
                        ? 'bg-orange-300 text-white cursor-wait'
                        : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600'
                    }`}
                  >
                    {processingPayment ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : currentUserSubscription.toLowerCase() === selectedPlan ? (
                      'Current Plan'
                    ) : (
                      (() => {
                        const levels = ['flex', 'silver', 'gold'];
                        const currentIndex = levels.indexOf(currentUserSubscription.toLowerCase());
                        const selectedIndex = levels.indexOf(selectedPlan);
                        return selectedIndex > currentIndex ? 'Upgrade Now' : 'Downgrade';
                      })()
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMembersNote && (
        <MembersNoteModal onClose={() => setShowMembersNote(false)} />
      )}

      {showPaymentMethodModal && (
        <ChoosePaymentMethod
          onClose={() => setShowPaymentMethodModal(false)}
          onPaymentMethodSelected={handlePaymentMethodSelected}
          title="Choose Payment Method"
          description="Select a payment method for your subscription"
          userProfile={userProfile}
        />
      )}
    </div>
  );
}
