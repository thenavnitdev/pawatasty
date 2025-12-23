import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import ReportPowerBankModal from './ReportPowerBankModal';
import ReportStationModal from './ReportStationModal';
import ReportAppModal from './ReportAppModal';
import SuggestionsModal from './SuggestionsModal';

interface ReportFaultModalProps {
  onClose: () => void;
  bookingId?: number;
  orderId?: number;
}

export default function ReportFaultModal({ onClose, bookingId, orderId }: ReportFaultModalProps) {
  const [showReportPowerBank, setShowReportPowerBank] = useState(false);
  const [showReportStation, setShowReportStation] = useState(false);
  const [showReportApp, setShowReportApp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handlePowerStation = () => {
    setShowReportStation(true);
  };

  const handleMobileApp = () => {
    setShowReportApp(true);
  };

  const handleSuggestions = () => {
    setShowSuggestions(true);
  };

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
    <>
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
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>Report or Suggest</h2>
          <p className="text-slate-800 text-center mb-8">
            Report a malfunction or share suggestions?
          </p>

          <div className="w-full grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={handlePowerStation}
              className="bg-blue-50 hover:bg-blue-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
            >
              <div className="text-4xl mb-2">🔌</div>
              <span className="text-slate-800 font-semibold text-sm">Power Station</span>
            </button>

            <button
              onClick={() => setShowReportPowerBank(true)}
              className="bg-pink-50 hover:bg-pink-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
            >
              <div className="text-4xl mb-2">🔋</div>
              <span className="text-slate-800 font-semibold text-sm">Power Bank</span>
            </button>

            <button
              onClick={handleMobileApp}
              className="bg-green-50 hover:bg-green-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
            >
              <Smartphone className="w-12 h-12 text-slate-700 mb-2" strokeWidth={1.5} />
              <span className="text-slate-800 font-semibold text-sm">Mobile App</span>
            </button>

            <button
              onClick={handleSuggestions}
              className="bg-orange-50 hover:bg-orange-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]"
            >
              <div className="text-4xl mb-2">💭</div>
              <span className="text-slate-800 font-semibold text-sm text-center">Share your suggestions</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {showReportPowerBank && <ReportPowerBankModal onClose={() => setShowReportPowerBank(false)} bookingId={bookingId} orderId={orderId} />}
    {showReportStation && <ReportStationModal onClose={() => setShowReportStation(false)} bookingId={bookingId} orderId={orderId} />}
    {showReportApp && <ReportAppModal onClose={() => setShowReportApp(false)} />}
    {showSuggestions && <SuggestionsModal onClose={() => setShowSuggestions(false)} />}
    </>
  );
}
