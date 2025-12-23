import { AlertCircle, X } from 'lucide-react';

interface SubscriptionRentalWarningModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SubscriptionRentalWarningModal({
  onConfirm,
  onCancel
}: SubscriptionRentalWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Additional Rental
              </h3>
              <p className="text-sm text-gray-500">
                Paid rental notice
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 mb-6">
          <p className="text-gray-800 font-medium mb-3">
            You've already used your free daily power bank rental.
          </p>
          <p className="text-gray-700 text-sm mb-4">
            Additional rentals will be charged:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">€1.00 upfront</span> covers the first 30 minutes
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">€1.00 per 30 minutes</span> thereafter
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">€5.00 daily cap</span> maximum charge
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            Continue with Payment
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl hover:bg-gray-200 transition-colors active:scale-[0.98]"
          >
            Cancel Rental
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
