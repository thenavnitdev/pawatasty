import { X } from 'lucide-react';

interface FlexPlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function FlexPlanUpgradeModal({ isOpen, onClose, onUpgrade }: FlexPlanUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl max-w-md w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-2">
          <div
            onClick={onClose}
            className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto cursor-pointer active:cursor-grabbing"
          />
        </div>

        <div className="px-8 py-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Become a Member</h2>

          <p className="text-center text-gray-700 text-base leading-relaxed mb-6 px-2">
            Deal bookings are only available for <strong>Silver</strong> and <strong>Gold</strong> subscription members.
          </p>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 mb-8 w-full">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">Silver & Gold Benefits:</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 text-sm leading-relaxed">All deals city-wide included</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 text-sm leading-relaxed">Free power bank rental per day</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 text-sm leading-relaxed">Priority access to exclusive spots</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 text-sm leading-relaxed">Save on dining experiences</span>
              </div>
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-4 rounded-[1rem] transition-all mb-3"
          >
            Upgrade Now
          </button>

          <button
            onClick={onClose}
            className="text-gray-600 font-medium py-2"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
