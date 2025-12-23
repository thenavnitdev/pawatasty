import { X, AlertTriangle } from 'lucide-react';
import { PaymentMethod } from '../services/mobile/paymentMethods';

interface DeletePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentMethod: PaymentMethod | null;
  isDeleting?: boolean;
}

export default function DeletePaymentMethodModal({
  isOpen,
  onClose,
  onConfirm,
  paymentMethod,
  isDeleting,
}: DeletePaymentMethodModalProps) {
  if (!isOpen || !paymentMethod) return null;

  const getPaymentMethodDisplay = () => {
    if (paymentMethod.type === 'ideal') {
      return `iDEAL •••• ${paymentMethod.lastFour}`;
    }

    if (paymentMethod.type === 'paypal') {
      return `PayPal - ${paymentMethod.email}`;
    }

    const brand = paymentMethod.cardBrand
      ? paymentMethod.cardBrand.charAt(0).toUpperCase() + paymentMethod.cardBrand.slice(1)
      : 'Card';

    let display = `${brand} •••• ${paymentMethod.lastFour}`;

    if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
      display += ` - Expires ${String(paymentMethod.expiryMonth).padStart(2, '0')}/${String(paymentMethod.expiryYear).slice(-2)}`;
    }

    return display;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center animate-fadeIn">
      <div className="bg-white rounded-t-3xl w-full max-w-md overflow-hidden shadow-xl animate-slideUp">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Delete Payment Method?
          </h2>

          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this payment method?
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-gray-900 font-medium">{getPaymentMethodDisplay()}</p>
            {paymentMethod.cardholderName && (
              <p className="text-gray-500 text-sm mt-1">{paymentMethod.cardholderName}</p>
            )}
          </div>

          <p className="text-red-600 text-sm font-medium mb-6">
            This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
