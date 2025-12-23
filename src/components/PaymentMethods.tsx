import { ChevronLeft, CreditCard, Plus, AlertCircle, X, Trash2, MoreVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { paymentMethodsAPI, PaymentMethod } from '../services/mobile/paymentMethods';
import AddCardModal from './AddCardModal';
import DeletePaymentMethodModal from './DeletePaymentMethodModal';
import { useToast } from '../utils/toastContext';

interface PaymentMethodsProps {
  onClose: () => void;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

export default function PaymentMethods({ onClose, userProfile }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showSetPrimaryModal, setShowSetPrimaryModal] = useState(false);
  const [methodToSetPrimary, setMethodToSetPrimary] = useState<PaymentMethod | null>(null);

  const { showSuccess, showError } = useToast();

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching payment methods...');
      const response = await paymentMethodsAPI.getPaymentMethods();
      console.log('Payment methods response:', response);
      const methods = response.paymentMethods || [];
      setPaymentMethods(methods);

      const primary = methods.find(m => m.isPrimary);
      if (primary) {
        setSelectedMethodId(primary.id);
      } else if (methods.length > 0) {
        setSelectedMethodId(methods[0].id);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment methods';
      console.error('Error message:', errorMessage);
      if (errorMessage.includes('Not authenticated')) {
        setError('Please log in to view your payment methods');
      } else if (errorMessage.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        setError('Unable to load payment methods. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleSetPrimaryClick = (method: PaymentMethod) => {
    setMethodToSetPrimary(method);
    setShowSetPrimaryModal(true);
    setOpenDropdownId(null);
  };

  const handleSetPrimaryConfirm = async () => {
    if (!methodToSetPrimary) return;

    try {
      setSettingPrimaryId(methodToSetPrimary.id);
      await paymentMethodsAPI.setDefaultPaymentMethod(methodToSetPrimary.id);
      setShowSetPrimaryModal(false);
      setMethodToSetPrimary(null);
      await fetchPaymentMethods();
      showSuccess('Payment method updated successfully');
    } catch (err) {
      console.error('Error setting primary payment method:', err);
      showError('Failed to set as primary. Please try again.');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setMethodToDelete(method);
    setShowDeleteModal(true);
    setOpenDropdownId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!methodToDelete) return;

    const wasPrimary = methodToDelete.isPrimary;

    try {
      setDeletingId(methodToDelete.id);
      await paymentMethodsAPI.deletePaymentMethod(methodToDelete.id);
      setShowDeleteModal(false);
      setMethodToDelete(null);
      await fetchPaymentMethods();

      // If the deleted method was primary, set the first available method as primary
      if (wasPrimary) {
        const remainingMethods = paymentMethods.filter(m => m.id !== methodToDelete.id);
        if (remainingMethods.length > 0) {
          try {
            await paymentMethodsAPI.setDefaultPaymentMethod(remainingMethods[0].id);
            await fetchPaymentMethods();
          } catch (err) {
            console.error('Error setting new primary payment method:', err);
          }
        }
      }
      showSuccess('Payment method deleted');
    } catch (err) {
      console.error('Error deleting payment method:', err);
      showError('Failed to delete payment method. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSuccess = async () => {
    setShowAddCard(false);
    await fetchPaymentMethods();
  };

  const getShortIdentifier = (method: PaymentMethod): string => {
    if (method.email) {
      const parts = method.email.split('@');
      if (parts.length === 2) {
        const [localPart, domain] = parts;
        if (localPart && localPart.length <= 3) {
          return method.email;
        }
        if (localPart && domain) {
          return `${localPart.slice(0, 3)}...@${domain}`;
        }
      }
    }

    if (method.cardholderName) {
      if (method.cardholderName.length <= 15) {
        return method.cardholderName;
      }
      return method.cardholderName.slice(0, 15) + '...';
    }

    return `****${method.lastFour}`;
  };

  const getCardGradient = (method: PaymentMethod) => {
    const brand = method.cardBrand?.toLowerCase();
    const type = method.type;

    // Visa - Blue gradient
    if (brand === 'visa') {
      return {
        card: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900',
        circle1: 'bg-blue-500/30',
        circle2: 'bg-blue-400/20',
      };
    }

    // Mastercard - Red/Orange gradient
    if (brand === 'mastercard') {
      return {
        card: 'bg-gradient-to-br from-red-600 via-orange-600 to-red-800',
        circle1: 'bg-orange-500/30',
        circle2: 'bg-red-400/20',
      };
    }

    // Google Pay - Multi-color gradient
    if (type === 'googlepay') {
      return {
        card: 'bg-gradient-to-br from-blue-600 via-green-600 to-blue-700',
        circle1: 'bg-green-500/30',
        circle2: 'bg-blue-400/20',
      };
    }

    // Apple Pay - Black gradient
    if (type === 'applepay') {
      return {
        card: 'bg-gradient-to-br from-gray-900 via-black to-gray-900',
        circle1: 'bg-gray-700/30',
        circle2: 'bg-gray-600/20',
      };
    }

    // Bancontact - Blue gradient
    if (type === 'bancontact') {
      return {
        card: 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900',
        circle1: 'bg-blue-600/30',
        circle2: 'bg-blue-500/20',
      };
    }

    // SEPA - Dark Blue gradient
    if (type === 'sepa_debit') {
      return {
        card: 'bg-gradient-to-br from-blue-900 via-blue-950 to-indigo-950',
        circle1: 'bg-blue-800/30',
        circle2: 'bg-blue-700/20',
      };
    }

    // Default - Slate gray gradient
    return {
      card: 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800',
      circle1: 'bg-slate-600/30',
      circle2: 'bg-slate-500/20',
    };
  };

  const getCardBrandIcon = (method: PaymentMethod, size: 'normal' | 'large' = 'normal') => {
    const iconSize = size === 'large' ? 'w-16 h-16' : 'w-10 h-10';
    if (method.type === 'googlepay') {
      return (
        <div className={`${iconSize} bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200`}>
          <svg xmlns="http://www.w3.org/2000/svg" width={size === 'large' ? '38' : '24'} height={size === 'large' ? '16' : '10'} viewBox="0 0 512 204">
            <path fill="#5f6368" d="M362.927 55.057c14.075 0 24.952 3.839 33.27 11.517c8.317 7.677 12.155 17.914 12.155 30.71v61.42h-17.914V144.63h-.64c-7.677 11.517-18.554 17.275-31.35 17.275c-10.877 0-20.474-3.2-28.151-9.597c-7.038-6.398-11.517-15.355-11.517-24.952q0-15.356 11.517-24.953c7.677-6.398 18.554-8.957 31.35-8.957c11.516 0 20.474 1.92 27.511 6.398v-4.478c0-5.972-2.229-11.943-6.688-15.834l-.99-.801c-5.118-4.479-11.516-7.038-18.553-7.038q-16.315 0-24.953 13.436L321.34 74.89c10.236-13.436 23.672-19.834 41.587-19.834M272.715 11.55c11.48 0 22.39 3.995 31.113 11.445l1.517 1.35c8.957 7.678 13.435 19.195 13.435 31.351s-4.478 23.033-13.435 31.35s-19.834 12.796-32.63 12.796l-30.71-.64v59.502H222.81V11.55zm92.77 97.25q-11.516 0-19.193 5.758q-7.678 4.798-7.678 13.435c0 5.119 2.56 9.597 6.398 12.157c4.479 3.199 9.597 5.118 14.716 5.118c7.165 0 14.331-2.787 19.936-7.84l1.177-1.117c6.398-5.758 9.597-12.796 9.597-20.474c-5.758-4.478-14.076-7.038-24.952-7.038m-91.49-79.336h-31.99V80.65h31.99c7.037 0 14.075-2.559 18.554-7.677c10.236-9.597 10.236-25.592.64-35.19l-.64-.64c-5.119-5.118-11.517-8.317-18.555-7.677M512 58.256l-63.34 145.235h-19.194l23.672-50.544l-41.587-94.051h20.474l30.07 72.297h.64l29.431-72.297H512z"/>
            <path fill="#4285f4" d="M165.868 86.407c0-5.758-.64-11.516-1.28-17.274H84.615v32.63h45.425c-1.919 10.236-7.677 19.833-16.634 25.592v21.113h27.511c15.995-14.715 24.952-36.469 24.952-62.06"/>
            <path fill="#34a853" d="M84.614 168.942c23.032 0 42.226-7.678 56.302-20.474l-27.511-21.113c-7.678 5.118-17.275 8.317-28.791 8.317c-21.754 0-40.948-14.715-47.346-35.189H9.118v21.753c14.715 28.791 43.506 46.706 75.496 46.706"/>
            <path fill="#fbbc04" d="M37.268 100.483c-3.838-10.237-3.838-21.753 0-32.63V46.1H9.118c-12.157 23.673-12.157 51.824 0 76.136z"/>
            <path fill="#ea4335" d="M84.614 33.304c12.156 0 23.672 4.479 32.63 12.796l24.312-24.312C126.2 7.712 105.727-.605 85.253.034c-31.99 0-61.42 17.915-75.496 46.706l28.151 21.753c5.758-20.474 24.952-35.189 46.706-35.189"/>
          </svg>
        </div>
      );
    }

    if (method.type === 'applepay') {
      return (
        <div className={`${iconSize} bg-black rounded-lg flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width={size === 'large' ? '32' : '20'} height={size === 'large' ? '32' : '20'} viewBox="0 0 32 32">
            <path fill="white" d="M5.849 11.047c-.376.448-.975.803-1.573.751c-.079-.604.219-1.251.563-1.652c.375-.457 1.031-.785 1.563-.812c.063.631-.183 1.251-.552 1.713zm.547.87c-.869-.053-1.615.499-2.027.499c-.421 0-1.052-.473-1.739-.457c-.891.011-1.724.52-2.177 1.339c-.943 1.629-.245 4.041.661 5.369c.443.656.973 1.375 1.672 1.355c.661-.027.927-.437 1.724-.437c.807 0 1.036.437 1.74.421c.723-.011 1.181-.656 1.624-1.312c.505-.745.713-1.475.724-1.511c-.011-.016-1.401-.552-1.411-2.167c-.011-1.355 1.093-2 1.14-2.037c-.62-.937-1.599-1.036-1.932-1.061zm5.016-1.834v9.855h1.515v-3.369h2.095c1.911 0 3.255-1.328 3.255-3.245c0-1.921-1.317-3.24-3.203-3.24zm1.515 1.292h1.745c1.312 0 2.063.708 2.063 1.953s-.751 1.959-2.073 1.959h-1.735zm8.109 8.636c.953 0 1.833-.484 2.235-1.256h.032v1.183h1.4v-4.907c0-1.416-1.124-2.337-2.859-2.337c-1.604 0-2.792.932-2.833 2.208h1.359c.115-.609.667-1.005 1.433-1.005c.927 0 1.443.437 1.443 1.24v.541l-1.885.115c-1.761.109-2.709.833-2.709 2.099c0 1.276.98 2.12 2.385 2.12zm.412-1.167c-.808 0-1.323-.391-1.323-.989c0-.62.495-.985 1.437-1.043l1.683-.104v.557c0 .923-.776 1.579-1.803 1.579zm5.125 3.776c1.473 0 2.167-.573 2.771-2.297L32 12.792h-1.536l-1.781 5.817h-.032l-1.781-5.817h-1.583l2.563 7.172l-.136.437c-.235.735-.609 1.02-1.276 1.02c-.12 0-.349-.015-.443-.025v1.183c.088.025.464.036.573.036z"/>
          </svg>
        </div>
      );
    }

    if (method.type === 'bancontact') {
      return (
        <div className={`${iconSize} bg-blue-600 rounded-lg flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width={size === 'large' ? '32' : '20'} height={size === 'large' ? '32' : '20'} viewBox="0 0 32 32">
            <path fill="white" d="M28.516 13.027h-9.433l-5.723 6.692H2.079l3.041-3.583H1.495c-.823 0-1.495.687-1.495 1.531v3.24c0 .843.672 1.531 1.495 1.531H18.74c.823 0 1.948-.511 2.5-1.14l2.609-2.964l4.624-5.26zm-1.5 1.702l-1 1.14zm3.489-5.166H13.306c-.823 0-1.947.511-2.5 1.135l-7.317 8.281h9.396l5.823-6.692h11.229l-3.016 3.583h3.584c.823 0 1.495-.692 1.495-1.536v-3.235c0-.844-.672-1.536-1.495-1.536m-2.494 4.03l-.5.568l-.131.156z"/>
          </svg>
        </div>
      );
    }

    if (method.type === 'sepa_debit') {
      return (
        <div className={`${iconSize} bg-blue-900 rounded-lg flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width={size === 'large' ? '32' : '20'} height={size === 'large' ? '32' : '20'} viewBox="0 0 24 24">
            <path fill="white" d="M12.553 8.72v6.56h1.766v-1.694h1.052l.293-.01q.868-.013.984-.033q.985-.13 1.3-.994q.16-.436.16-1.434q0-.83-.145-1.243q-.277-.786-1.09-1.04q-.354-.111-1.031-.111zm6.79 0l-1.971 6.56h1.826l.317-1.134h2.36l.337 1.133H24l-1.995-6.558zm-9.339.031a3.36 3.36 0 0 0-1.888.574a3.27 3.27 0 0 0-1.199 1.455h-.742l-.464.996h.969a3 3 0 0 0 .004.526h-.467l-.465.995H6.94a3.33 3.33 0 0 0 3.064 1.973a3.37 3.37 0 0 0 1.876-.564l.013-.009v-1.241l-.05.056a2.293 2.293 0 0 1-3.618-.215h2.396l.465-.995H7.838a2.4 2.4 0 0 1-.012-.526h3.505l.008-.017l.438-.939l.019-.04H8.154a2.31 2.31 0 0 1 1.963-1.108c.694 0 1.344.31 1.783.85l.028.035l.409-.875l-.015-.014a3.36 3.36 0 0 0-2.318-.917m-7.2.004q-.658 0-1.196.048q-.646.051-1.062.348a1.1 1.1 0 0 0-.41.565q-.128.372-.128.99q0 .81.236 1.21q.269.47 1.074.621q.308.052 1.094.109q.981.066 1.098.103q.316.095.316.528a1.1 1.1 0 0 1-.037.315a.48.48 0 0 1-.298.287q-.127.048-.589.048h-.604a1 1 0 0 1-.41-.09q-.246-.121-.246-.549v-.136H0q0 .8.118 1.143q.213.618.879.82q.543.165 1.922.164q.826 0 1.228-.075q.96-.18 1.233-.853q.151-.368.151-1.16q0-.344-.033-.617a1.2 1.2 0 0 0-.355-.74q-.379-.363-1.22-.448q-.265-.028-1.33-.1l-.331-.023a.8.8 0 0 1-.35-.094q-.185-.113-.185-.471q0-.396.208-.514t.852-.118q.661 0 .808.205q.095.138.095.542h1.642q.016-.217.016-.326q0-1.325-1.072-1.613q-.44-.119-1.473-.119zm17.894 1.27l.827 2.843h-1.63zm-6.38.13h1.116q.27 0 .342.01q.36.063.456.345q.067.201.067.617a3 3 0 0 1-.033.512q-.053.258-.21.344q-.114.063-.637.082h-1.1Z"/>
          </svg>
        </div>
      );
    }

    const brand = method.cardBrand?.toLowerCase();
    if (brand === 'visa') {
      return (
        <div className={`bg-white rounded-lg ${size === 'large' ? 'px-4 py-3' : 'px-3 py-2'} shadow-sm border border-gray-200`}>
          <span className={`text-blue-600 font-bold ${size === 'large' ? 'text-2xl' : 'text-lg'}`}>VISA</span>
        </div>
      );
    }

    if (brand === 'mastercard') {
      return (
        <div className={`${iconSize} rounded-lg flex items-center justify-center`}>
          <div className="flex gap-[-4px]">
            <div className={`${size === 'large' ? 'w-8 h-8' : 'w-6 h-6'} bg-red-500 rounded-full`}></div>
            <div className={`${size === 'large' ? 'w-8 h-8 -ml-3' : 'w-6 h-6 -ml-2'} bg-yellow-500 rounded-full`}></div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${iconSize} bg-gray-200 rounded-lg flex items-center justify-center`}>
        <CreditCard className={`${size === 'large' ? 'w-8 h-8' : 'w-5 h-5'} text-gray-600`} />
      </div>
    );
  };

  const primaryMethod = paymentMethods.find(m => m.isPrimary) || paymentMethods[0];
  const alternativeMethods = paymentMethods.filter(m => m.id !== primaryMethod?.id);

  if (showAddCard) {
    return <AddCardModal onClose={() => setShowAddCard(false)} onSuccess={handleAddSuccess} userProfile={userProfile} />;
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto pb-32">
        <div className="min-h-full w-full max-w-md mx-auto bg-white">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Payment</h1>
            <button
              onClick={onClose}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-900" />
            </button>
          </div>

          <div className="px-6 pt-6 space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded-3xl animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-20 bg-gray-200 rounded-2xl animate-pulse"></div>
                  <div className="h-20 bg-gray-200 rounded-2xl animate-pulse"></div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h3 className="text-gray-900 font-bold text-xl mb-3">
                  {error.includes('log in') ? 'Authentication Required' : 'Something went wrong'}
                </h3>
                <p className="text-gray-600 text-sm mb-8">{error}</p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={fetchPaymentMethods}
                    className="w-full bg-slate-700 text-white px-6 py-3.5 rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-md"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white px-8 py-3.5 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all font-medium shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Payment Method
                  </button>
                </div>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-bold text-xl mb-3">No payment methods</h3>
                <p className="text-gray-600 text-sm mb-8">Add a payment method to continue</p>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-10 py-3.5 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all font-medium shadow-lg"
                >
                  Add Payment Method
                </button>
              </div>
            ) : (
              <>
                {primaryMethod && (
                  <div className={`relative h-48 ${getCardGradient(primaryMethod).card} rounded-3xl p-6 overflow-hidden shadow-xl`}>
                    <div className={`absolute top-0 right-0 w-64 h-64 ${getCardGradient(primaryMethod).circle1} rounded-full -mr-32 -mt-32`}></div>
                    <div className={`absolute bottom-0 right-0 w-48 h-48 ${getCardGradient(primaryMethod).circle2} rounded-full -mr-16 -mb-16`}></div>

                    <div className="absolute top-4 right-4 z-20">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === primaryMethod.id ? null : primaryMethod.id)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-white" />
                      </button>

                      {openDropdownId === primaryMethod.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                            <button
                              onClick={() => handleDeleteClick(primaryMethod)}
                              className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                            >
                              <Trash2 className="w-5 h-5" />
                              <span className="font-medium">Delete Card</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <p className="text-white/90 text-sm font-medium mb-1">
                          {primaryMethod.type === 'card' ? 'Credit Card'
                            : primaryMethod.type === 'applepay' ? 'Apple Pay'
                            : primaryMethod.type === 'googlepay' ? 'Google Pay'
                            : primaryMethod.type === 'bancontact' ? 'Bancontact'
                            : primaryMethod.type === 'sepa_debit' ? 'SEPA Direct Debit'
                            : 'Payment Method'}
                        </p>
                      </div>

                      <div>
                        <p className="text-white text-2xl font-semibold tracking-wider mb-3">
                          **** **** **** {primaryMethod.lastFour}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium">{getShortIdentifier(primaryMethod)}</p>
                          {primaryMethod.cardBrand?.toLowerCase() === 'mastercard' && (
                            <div className="flex gap-[-8px]">
                              <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                              <div className="w-8 h-8 bg-yellow-500 rounded-full -ml-3"></div>
                            </div>
                          )}
                          {primaryMethod.cardBrand?.toLowerCase() === 'visa' && (
                            <div className="bg-white rounded px-2 py-1">
                              <span className="text-blue-600 font-bold text-sm">VISA</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {alternativeMethods.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-gray-900 font-bold text-lg">Alternative</h3>

                    {alternativeMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 relative"
                      >
                        <div className="flex-1 flex items-center gap-4">
                          {getCardBrandIcon(method)}

                          <div className="flex-1 text-left">
                            <p className="text-gray-900 font-semibold">
                              **** {method.lastFour}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {getShortIdentifier(method)}
                            </p>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === method.id ? null : method.id)}
                            className="p-3 hover:bg-gray-200 rounded-xl transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>

                          {openDropdownId === method.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                                <button
                                  onClick={() => handleSetPrimaryClick(method)}
                                  className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
                                >
                                  <CreditCard className="w-5 h-5 text-gray-600" />
                                  <span className="font-medium">Set Primary</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(method)}
                                  className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 border-t border-gray-100"
                                >
                                  <Trash2 className="w-5 h-5" />
                                  <span className="font-medium">Delete Card</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowAddCard(true)}
                  className="w-full border-2 border-dashed border-gray-300 text-gray-700 font-semibold py-5 rounded-2xl hover:border-slate-700 hover:text-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add new card
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <DeletePaymentMethodModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMethodToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        paymentMethod={methodToDelete}
        isDeleting={deletingId !== null}
      />

      {showSetPrimaryModal && methodToSetPrimary && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center animate-fadeIn">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 shadow-2xl animate-slideUp">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4">
                {getCardBrandIcon(methodToSetPrimary, 'large')}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Set as Primary?</h3>
              <p className="text-gray-600 text-sm">
                Make **** **** {methodToSetPrimary.lastFour} your primary payment method?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSetPrimaryModal(false);
                  setMethodToSetPrimary(null);
                }}
                disabled={settingPrimaryId !== null}
                className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPrimaryConfirm}
                disabled={settingPrimaryId !== null}
                className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold py-3.5 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingPrimaryId ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Setting...</span>
                  </div>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
