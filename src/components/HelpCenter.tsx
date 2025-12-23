import { ChevronLeft, MessageCircle, AlertTriangle, Info, HelpCircle, Share2, X } from 'lucide-react';
import { useState } from 'react';
import PriceInfoModal from './PriceInfoModal';
import HowToUseDealsModal from './HowToUseDealsModal';
import HowToUnlockPBModal from './HowToUnlockPBModal';
import ReportFaultModal from './ReportFaultModal';
import FollowUsModal from './FollowUsModal';
import SupportChat from './SupportChat';

interface HelpCenterProps {
  onBack: () => void;
  onNavigateToMap?: () => void;
}

export default function HelpCenter({ onBack, onNavigateToMap }: HelpCenterProps) {
  const [showPriceInfo, setShowPriceInfo] = useState(false);
  const [showHowToUseDeals, setShowHowToUseDeals] = useState(false);
  const [showHowToUnlockPB, setShowHowToUnlockPB] = useState(false);
  const [showReportFault, setShowReportFault] = useState(false);
  const [showFollowUs, setShowFollowUs] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);

  const handleSupportChat = () => {
    setShowSupportChat(true);
  };

  const handleFAQ = () => {
    console.log('Open FAQ');
  };

  return (
    <>
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto">
          <div className="sticky top-0 bg-gray-50 z-10 px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <h1 className="text-xl font-bold text-slate-700">How can we Help?</h1>
              <button onClick={onNavigateToMap} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-6 pt-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleSupportChat}
                className="bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
              >
                <MessageCircle className="w-8 h-8 text-white" strokeWidth={1.5} />
                <span className="text-white font-medium text-base">Support chat</span>
              </button>

              <button
                onClick={() => setShowReportFault(true)}
                className="bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
              >
                <AlertTriangle className="w-8 h-8 text-white" strokeWidth={1.5} />
                <span className="text-white font-medium text-base">Report a Fault</span>
              </button>

              <button
                onClick={() => setShowPriceInfo(true)}
                className="bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
              >
                <Info className="w-8 h-8 text-white" strokeWidth={1.5} />
                <span className="text-white font-medium text-base">Price Info</span>
              </button>

              <button
                onClick={handleFAQ}
                className="bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
              >
                <HelpCircle className="w-8 h-8 text-white" strokeWidth={1.5} />
                <span className="text-white font-medium text-base">FAQ</span>
              </button>
            </div>

            <button
              onClick={() => setShowFollowUs(true)}
              className="w-full bg-slate-700 hover:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px] mb-6"
            >
              <Share2 className="w-8 h-8 text-white" strokeWidth={1.5} />
              <span className="text-white font-medium text-base">Follow Us</span>
            </button>

            <button
              onClick={() => setShowHowToUseDeals(true)}
              className="w-full bg-orange-100 hover:bg-orange-200 rounded-2xl p-4 transition-colors mb-4"
            >
              <span className="font-semibold text-base" style={{ color: '#ff5600' }}>How to find and use deals?</span>
            </button>

            <button
              onClick={() => setShowHowToUnlockPB(true)}
              className="w-full bg-orange-100 hover:bg-orange-200 rounded-2xl p-4 transition-colors"
            >
              <span className="font-semibold text-base" style={{ color: '#ff5600' }}>How to unlock and return PB?</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {showPriceInfo && <PriceInfoModal onClose={() => setShowPriceInfo(false)} />}
    {showHowToUseDeals && <HowToUseDealsModal onClose={() => setShowHowToUseDeals(false)} />}
    {showHowToUnlockPB && <HowToUnlockPBModal onClose={() => setShowHowToUnlockPB(false)} />}
    {showReportFault && <ReportFaultModal onClose={() => setShowReportFault(false)} />}
    {showFollowUs && <FollowUsModal onClose={() => setShowFollowUs(false)} />}
    {showSupportChat && <SupportChat onClose={() => setShowSupportChat(false)} onCloseToMap={onNavigateToMap} />}
    </>
  );
}
