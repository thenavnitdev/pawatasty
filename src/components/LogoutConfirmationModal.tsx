import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmationModal({ isOpen, onClose, onConfirm }: LogoutConfirmationModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleConfirm = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onConfirm();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{
        backgroundColor: isAnimating ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0)',
        backdropFilter: isAnimating ? 'blur(4px)' : 'blur(0px)',
        transition: 'background-color 300ms ease-out, backdrop-filter 300ms ease-out'
      }}
      onClick={handleClose}
    >
      <div
        className="w-full bg-white rounded-t-[2rem] p-6 shadow-2xl"
        style={{
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 text-center">
            Are you sure you want to log out?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3.5 rounded-2xl transition-all"
          >
            Stay In
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-md"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
