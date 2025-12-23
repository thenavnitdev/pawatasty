import { useState } from 'react';

interface PriceInfoModalProps {
  onClose: () => void;
}

export default function PriceInfoModal({ onClose }: PriceInfoModalProps) {
  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    if (touchEnd - touchStart > 100) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="pt-3 pb-2">
          <div
            className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto cursor-pointer active:cursor-grabbing"
          />
        </div>
        <div className="px-6 pb-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg">
            <div className="text-4xl">🤝</div>
          </div>

          <h2 className="text-2xl font-bold text-orange-500 mb-6">Price Info</h2>

          <div className="w-full space-y-4 text-left mb-8">
            <div>
              <h3 className="text-orange-500 font-semibold mb-2">Flex:</h3>
              <p className="text-slate-800 text-sm leading-relaxed">
                Rental duration is rounded to half hour block (30 or 60 minutes) with maximum €5.00 per day.
              </p>
            </div>

            <div>
              <h3 className="text-orange-500 font-semibold mb-2">Membership:</h3>
              <p className="text-slate-800 text-sm leading-relaxed">
                Users have the freedom to rent power banks at any time with a membership plan
              </p>
            </div>

            <div>
              <h3 className="text-orange-500 font-semibold mb-2">Failure to return:</h3>
              <p className="text-slate-800 text-sm leading-relaxed">
                If the power bank isn't returned within 5 days, a rental fee for 5 days plus a €25.00 late fee will be charged. This applies to all customers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-4 rounded-[1rem] transition-all shadow-md"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
