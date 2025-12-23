import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import NumericCodeInput from './NumericCodeInput';
import { useToast } from '../utils/toastContext';

interface ReportStationModalProps {
  onClose: () => void;
  bookingId?: number;
  orderId?: number;
}

export default function ReportStationModal({ onClose, bookingId, orderId }: ReportStationModalProps) {
  const [qrCode, setQrCode] = useState(['', '', '', '', '', '']);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const { showSuccess } = useToast();

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    if (touchEnd - touchStart > 100) {
      onClose();
    }
  };

  const categories = ['Not Ejecting', 'Not Online', 'Other'];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        alert('Please log in to submit a report');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fault-reports`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'power_station',
          qrCode: qrCode.join(''),
          category: selectedCategory,
          description,
          bookingId,
          orderId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to submit report');
      }

      const result = await response.json();
      console.log('Report submitted successfully:', result);
      showSuccess('Successfully submitted!');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to submit report: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
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
        <div className="px-6 py-6 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#1e293b' }}>Report Station Fault</h2>

          <p className="text-slate-700 text-center mb-2 text-sm">
            Enter the 6 numbers below the
          </p>
          <p className="text-orange-400 text-center mb-4 text-sm font-semibold">QR code</p>

          <div className="mb-4 flex justify-center">
            <NumericCodeInput
              value={qrCode}
              onChange={setQrCode}
              disabled={isSubmitting}
            />
          </div>

          <div className="w-full mb-4">
            <label className="text-slate-800 font-medium text-sm mb-2 block">
              Select category<span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === category
                      ? 'bg-orange-400 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full mb-4">
            <label className="text-slate-800 font-medium text-sm mb-2 block">
              Describe the Issue<span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=""
              className="w-full h-32 p-4 border-2 border-orange-400 rounded-2xl focus:outline-none focus:border-orange-500 resize-none text-sm text-slate-700"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!qrCode.every(d => d) || !selectedCategory || !description || isSubmitting}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-4 rounded-[1rem] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
