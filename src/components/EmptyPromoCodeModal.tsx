interface EmptyPromoCodeModalProps {
  onClose: () => void;
}

export default function EmptyPromoCodeModal({ onClose }: EmptyPromoCodeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl max-w-md w-full shadow-2xl animate-slide-up">
        <div className="pt-3 pb-2">
          <div
            onClick={onClose}
            className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto cursor-pointer active:cursor-grabbing"
          />
        </div>
        <div className="px-6 pb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Please enter a promo code.
          </h2>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-3.5 rounded-[1rem] transition-all shadow-lg mt-6"
          >
            OK, Got it
          </button>
        </div>
      </div>
    </div>
  );
}
