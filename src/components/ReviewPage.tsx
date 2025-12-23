import { useState, useRef, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { reviewsAPI, reviewsEdgeAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';

interface ReviewPageProps {
  merchantId: string;
  merchantName: string;
  merchantImage?: string;
  onComplete: () => void;
}

const EMOJI_RATINGS = [
  { emoji: '😡', label: 'Terrible', value: 1, color: '#EF4444' },
  { emoji: '😞', label: 'Bad', value: 2, color: '#F97316' },
  { emoji: '😐', label: 'Okay', value: 3, color: '#FBBF24' },
  { emoji: '😊', label: 'Good', value: 4, color: '#10B981' },
  { emoji: '😍', label: 'Loved it', value: 5, color: '#8B5CF6' },
];

export default function ReviewPage({ merchantId, merchantName, merchantImage, onComplete }: ReviewPageProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    if (diff > 0) {
      setDragCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragCurrentY && dragCurrentY > 150) {
      handleClose();
    }
    setDragStartY(null);
    setDragCurrentY(null);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isFeatureEnabled('USE_EDGE_REVIEWS')) {
        await reviewsEdgeAPI.createReview({
          merchantId,
          rating,
          comment: comment.trim() || undefined,
        });
      } else {
        await reviewsAPI.createReview({
          target_type: 'merchant',
          target_id: merchantId,
          rating,
          comment: comment.trim() || undefined,
        });
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const translateY = dragCurrentY !== null ? dragCurrentY : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${
        isVisible ? 'bg-black/50' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`w-full max-w-2xl bg-white flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          transform: `translateY(${translateY}px)`,
          height: '90vh',
          borderTopLeftRadius: '1.5rem',
          borderTopRightRadius: '1.5rem',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white transition-colors"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        <div className="relative w-full h-64 overflow-hidden flex-shrink-0">
          {merchantImage ? (
            <img
              src={merchantImage}
              alt={merchantName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
        </div>

        <div className="flex-1 bg-white -mt-6 relative z-10 px-6 pt-6 flex flex-col overflow-hidden rounded-t-[1.5rem]">
        <div className="flex-1 overflow-y-auto pb-6">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-1">
            How did you experience
          </h2>
          <p className="text-lg font-semibold text-orange-500 text-center mb-6">
            {merchantName}
          </p>

          <div className="flex justify-center gap-[0.45rem] mb-6">
            {EMOJI_RATINGS.map((item) => (
              <button
                key={item.value}
                onClick={() => setRating(item.value)}
                className="flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95"
              >
                <div
                  className={`text-[2.8rem] leading-none transition-all ${
                    rating === item.value ? 'scale-110' : 'scale-100 opacity-80'
                  }`}
                >
                  {item.emoji}
                </div>
                {rating === item.value && (
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-3">
              Comments
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comments"
              rows={6}
              className="w-full px-4 py-3 border-2 border-orange-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm placeholder:text-gray-400"
            />
            <p className="text-xs text-orange-500 mt-1.5">* Optional</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}
          </div>

          <div className="pb-6 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
