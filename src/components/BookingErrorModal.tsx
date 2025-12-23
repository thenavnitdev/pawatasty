interface BookingErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function BookingErrorModal({ isOpen, onClose, message }: BookingErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-[2rem] w-full max-w-md mx-auto text-center shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-8 pb-10 px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
            <div className="text-4xl">😕</div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Oops error!</h3>
          <p className="text-gray-700 mb-8 leading-relaxed">
            {message || 'Something went wrong; failed to book the deal. Please try again.'}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-2xl font-semibold hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
