import { X } from 'lucide-react';
import { useState, useRef } from 'react';

interface DealNoteModalProps {
  onClose: () => void;
}

export default function DealNoteModal({ onClose }: DealNoteModalProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl animate-slide-up"
        style={{ transform: `translateY(${currentY}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-6 pt-6 pb-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-orange-300 flex items-center justify-center mb-6">
            <span className="text-4xl">🦉</span>
          </div>

          <h2 className="text-xl font-bold text-orange-500 mb-6 text-center">Please note!</h2>

          <div className="space-y-4 mb-6">
            <p className="text-gray-700 text-center text-sm leading-relaxed">
              All deals are redeemable on-site only; no reservations required.
            </p>
            <p className="text-gray-700 text-center text-sm leading-relaxed">
              Simply book and visit.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-3.5 rounded-[1rem] transition-all shadow-lg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
