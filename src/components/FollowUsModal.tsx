import { Facebook, Instagram } from 'lucide-react';
import { useState } from 'react';

interface FollowUsModalProps {
  onClose: () => void;
}

export default function FollowUsModal({ onClose }: FollowUsModalProps) {
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
  const handleFacebookClick = () => {
    window.open('https://www.facebook.com', '_blank');
  };

  const handleInstagramClick = () => {
    window.open('https://www.instagram.com', '_blank');
  };

  const handleTikTokClick = () => {
    window.open('https://www.tiktok.com', '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl max-w-md w-full shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-6 py-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg">
            <div className="text-4xl">💖</div>
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1e293b' }}>Follow Us</h2>

          <div className="w-full grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={handleFacebookClick}
              className="bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[130px]"
            >
              <Facebook className="w-10 h-10 text-white" strokeWidth={2} fill="white" />
              <span className="text-white font-medium text-base">Facebook</span>
            </button>

            <button
              onClick={handleInstagramClick}
              className="bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[130px]"
            >
              <Instagram className="w-10 h-10 text-white" strokeWidth={2} />
              <span className="text-white font-medium text-base">Instagram</span>
            </button>
          </div>

          <button
            onClick={handleTikTokClick}
            className="w-full bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[130px]"
          >
            <svg
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
            <span className="text-white font-medium text-base">TikTok</span>
          </button>
        </div>
      </div>
    </div>
  );
}
