import { useState, useEffect, useRef } from 'react';

interface PromoCodeFailedModalProps {
  onClose: () => void;
}

export default function PromoCodeFailedModal({ onClose }: PromoCodeFailedModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentY > 100) {
      handleClose();
    } else {
      setCurrentY(0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={sheetRef}
        className={`relative bg-white rounded-t-[2rem] w-full max-w-md shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          transform: isDragging ? `translateY(${currentY}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-4 mb-2" />

        <div className="px-8 pb-8 pt-4">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <span className="text-5xl">😢</span>
            </div>

            <h2 className="text-2xl font-bold text-orange-400 mb-4 text-center">
              Oops, Activation failed!
            </h2>

            <p className="text-gray-700 text-center mb-8 leading-relaxed">
              This promo code is valid only for new users within 24 hours of joining.
            </p>

            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-[1rem] font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
