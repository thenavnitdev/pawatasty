interface OTPErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OTPErrorModal({ isOpen, onClose }: OTPErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-8 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">😕</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Oops!</h2>
          <p className="text-gray-600 text-base">
            Your code is invalid or has expired.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-orange-400 text-white py-4 rounded-xl font-semibold hover:bg-orange-500 transition-colors text-lg"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
