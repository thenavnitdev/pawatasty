import { Squirrel } from 'lucide-react';
import { useState } from 'react';

interface MembersNoteModalProps {
  onClose: () => void;
}

export default function MembersNoteModal({ onClose }: MembersNoteModalProps) {
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (startY !== null && currentY !== null) {
      const deltaY = currentY - startY;
      if (deltaY > 50) {
        onClose();
      }
    }
    setStartY(null);
    setCurrentY(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startY === null) return;
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (startY !== null && currentY !== null) {
      const deltaY = currentY - startY;
      if (deltaY > 50) {
        onClose();
      }
    }
    setStartY(null);
    setCurrentY(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl max-w-md w-full p-8 shadow-2xl relative animate-slideUp">
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 cursor-pointer py-2 px-8"
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
            <Squirrel className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-xl font-semibold text-orange-500 mb-6">
            Members note!
          </h2>

          <div className="space-y-3 text-center w-full mb-8">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-800">Subscription:</span> Starts immediately upon upgrade.
            </p>

            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-800">Cancellation:</span> Downgrade to the Flex plan.
            </p>

            <p className="text-sm text-gray-600">
              Changes take effect at the end of the current plan.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold py-4 rounded-[1rem] hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
