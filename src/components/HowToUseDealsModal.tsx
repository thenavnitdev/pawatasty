import { MapPin, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface HowToUseDealsModalProps {
  onClose: () => void;
}

export default function HowToUseDealsModal({ onClose }: HowToUseDealsModalProps) {
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
        <div className="px-6 pt-6 pb-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg">
            <div className="text-4xl">😊</div>
          </div>

          <h2 className="text-2xl font-bold text-orange-400 mb-8">Find and use deals?</h2>

          <div className="w-full space-y-4 mb-8">
            <div className="bg-pink-50 rounded-3xl p-5 flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-7 h-7 text-orange-500" fill="currentColor" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-orange-400 font-bold text-lg mb-1">Step1</h3>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Simply pick a restaurant where you'd like to dine.
                </p>
              </div>
            </div>

            <div className="bg-cyan-50 rounded-3xl p-5 flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <div className="text-3xl">🎉</div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-orange-400 font-bold text-lg mb-1">Step 2</h3>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Book a deal, choose a day & time to visit and enjoy!
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-3xl p-5 flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <ArrowRight className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-orange-400 font-bold text-lg mb-1">Redeem deal</h3>
                <p className="text-slate-700 text-sm leading-relaxed">
                  Present your booking at the restaurant and swipe to redeem upon finishing.
                </p>
              </div>
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
