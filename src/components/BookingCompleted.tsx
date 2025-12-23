import { useEffect, useState } from 'react';
import { Check, Wallet } from 'lucide-react';
import ReviewPage from './ReviewPage';
import { supabase } from '../lib/supabase';

interface BookingCompletedProps {
  onContinue: () => void;
  onBookingChanged?: () => Promise<void>;
  savings?: number;
  totalSavings?: number;
  merchantId?: string;
  merchantName?: string;
  merchantImage?: string;
}

export default function BookingCompleted({ onContinue, onBookingChanged, savings = 0, totalSavings = 0, merchantId, merchantName, merchantImage }: BookingCompletedProps) {
  const [show, setShow] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  useEffect(() => {
    const checkExistingReview = async () => {
      if (!merchantId) {
        setCheckingReview(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCheckingReview(false);
          return;
        }

        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('target_type', 'merchant')
          .eq('target_id', merchantId)
          .maybeSingle();

        setHasReviewed(!!existingReview);
      } catch (error) {
        console.error('Error checking existing review:', error);
      } finally {
        setCheckingReview(false);
      }
    };

    checkExistingReview();
  }, [merchantId]);

  const handleContinue = async () => {
    if (merchantId && merchantName && !hasReviewed && !checkingReview) {
      setShowReview(true);
    } else {
      // Refresh data before going back
      if (onBookingChanged) {
        await onBookingChanged();
      }
      onContinue();
    }
  };

  if (showReview && merchantId && merchantName) {
    return (
      <ReviewPage
        merchantId={merchantId}
        merchantName={merchantName}
        merchantImage={merchantImage}
        onComplete={async () => {
          // Refresh data before going back
          if (onBookingChanged) {
            await onBookingChanged();
          }
          onContinue();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-white to-green-50 z-50 flex flex-col items-center justify-between p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute top-10 left-10 w-32 h-32 text-orange-200 opacity-30" viewBox="0 0 100 100">
          <path d="M10,50 Q30,30 50,50 T90,50" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <svg className="absolute top-20 right-8 w-24 h-24 text-green-200 opacity-30" viewBox="0 0 100 100">
          <path d="M20,50 Q40,20 60,50 T100,50" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <svg className="absolute bottom-32 left-8 w-28 h-28 text-orange-200 opacity-30" viewBox="0 0 100 100">
          <path d="M10,60 Q35,35 60,60 T110,60" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <svg className="absolute bottom-48 right-12 w-20 h-20 text-green-200 opacity-30" viewBox="0 0 100 100">
          <path d="M15,45 Q40,25 65,45 T115,45" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <div
          className={`relative mb-8 transition-all duration-700 ${
            show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s' }}></div>
          <div className="absolute inset-0 bg-green-300 rounded-full opacity-30 blur-2xl"></div>
          <div className="relative w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
            <Check className="w-20 h-20 text-white" strokeWidth={3} />
          </div>
        </div>

        <h1
          className={`text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 mb-6 text-center transition-all duration-700 delay-200 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          DEAL REDEEMED
        </h1>

        <p
          className={`text-xl text-gray-700 text-center font-medium leading-relaxed transition-all duration-700 delay-400 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Thanks for your visit<br />welcome back again!
        </p>

        <div
          className={`mt-8 w-full max-w-md bg-white rounded-2xl p-6 shadow-lg transition-all duration-700 delay-500 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-800">Money saved</h3>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              €{totalSavings.toFixed(2)}
            </div>
            {savings > 0 && (
              <div className="text-sm text-gray-600">
                +€{savings.toFixed(2)} from this booking
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleContinue}
        className={`w-full max-w-md bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 ${
          show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
        style={{ transitionDelay: '600ms' }}
      >
        Continue
      </button>
    </div>
  );
}
