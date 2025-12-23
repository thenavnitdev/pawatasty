import { Check } from 'lucide-react';
import { useEffect } from 'react';

interface SaveConfirmationProps {
  isVisible: boolean;
  onHide: () => void;
  message?: string;
}

export default function SaveConfirmation({
  isVisible,
  onHide,
  message = 'Changes were successfully saved.'
}: SaveConfirmationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-slide-down">
      <div className="bg-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-6 h-6 text-white stroke-[3]" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight">Change saved</h3>
          <p className="text-gray-600 text-xs leading-tight">{message}</p>
        </div>
      </div>
    </div>
  );
}
