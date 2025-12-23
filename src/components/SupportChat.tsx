import { ChevronLeft, X } from 'lucide-react';

interface SupportChatProps {
  onClose: () => void;
  onCloseToMap?: () => void;
}

export default function SupportChat({ onClose, onCloseToMap }: SupportChatProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Support</h2>
        <button onClick={onCloseToMap || onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <iframe
          src="https://chat.pawatasty.com?aid=b776b517-1e6b-4034-9559-ff823819883a&lang=en"
          className="w-full border-0 absolute top-[-120px] left-0 right-0"
          style={{ height: 'calc(100% + 120px)' }}
          title="Support Chat"
          allow="microphone; camera"
        />
      </div>
    </div>
  );
}
