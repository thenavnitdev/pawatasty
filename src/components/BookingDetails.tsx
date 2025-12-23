import { ChevronLeft, X, MapPin, Calendar, Clock, ArrowRight, ChevronRight, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import BookingCompleted from './BookingCompleted';
import DealNoteModal from './DealNoteModal';
import { supabase } from '../lib/supabase';

interface BookingDetailsProps {
  booking: {
    id: string;
    type: 'rental' | 'dining';
    name: string;
    address: string;
    city?: string;
    date: string;
    time: string;
    status: 'active' | 'complete' | 'cancelled' | 'lost';
    amount: number;
    image?: string;
    deal?: string;
    dealTitle?: string;
    dealDescription?: string;
    merchantId?: string;
  };
  onBack: () => void;
  onNavigateToMap?: () => void;
  onBookingChanged?: () => Promise<void>;
}

type ViewState = 'details' | 'completed';

export default function BookingDetails({ booking, onBack, onNavigateToMap, onBookingChanged }: BookingDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [view, setView] = useState<ViewState>('details');
  const [bookingSavings, setBookingSavings] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showDealNoteModal, setShowDealNoteModal] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const images = booking.image ? [booking.image] : [];

  // Check if booking is already completed or cancelled
  const isBookingFinalized = booking.status === 'complete' || booking.status === 'completed' || booking.status === 'cancelled';

  const handleRedeemBooking = async () => {
    try {
      console.log('🎯 Starting redemption for booking ID:', booking.id);
      setIsRedeeming(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('❌ No session found');
        throw new Error('Not authenticated');
      }

      console.log('📤 Sending completion request...');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-booking/bookings/${booking.id}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to complete booking. Status:', response.status, 'Response:', errorText);

        // Try to parse error message
        let errorMessage = 'Failed to complete booking';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Booking completion result:', result);

      // Store savings data
      const savings = result.savings || 0;
      const totalSavings = result.totalSavings || savings;

      console.log('💰 Savings - This booking:', savings, 'Total:', totalSavings);

      setBookingSavings(savings);
      setTotalSavings(totalSavings);

      // Show completed page
      console.log('🎉 Showing completion page in 500ms...');
      setTimeout(() => {
        setView('completed');
        setIsRedeeming(false);
      }, 500);
    } catch (error) {
      console.error('❌ Error completing booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to redeem booking: ${errorMessage}\n\nPlease try again or contact support.`);
      setIsRedeeming(false);
      setDragOffset(0);
      setIsDragging(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setIsCancelling(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-booking/bookings/${booking.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to cancel booking:', errorText);
        throw new Error('Failed to cancel booking');
      }

      // Refresh data and go back after successful cancellation
      if (onBookingChanged) {
        await onBookingChanged();
      }
      setTimeout(() => {
        onBack();
      }, 300);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setIsCancelling(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isBookingFinalized || isRedeeming) return;

    const touch = e.touches[0];
    setDragStartX(touch.clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !buttonRef.current || isBookingFinalized || isRedeeming) return;

    const touch = e.touches[0];
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const maxDrag = buttonRect.width - 80;

    // Calculate offset based on the drag distance from start
    const dragDistance = touch.clientX - dragStartX;
    const newOffset = Math.max(0, Math.min(dragDistance, maxDrag));

    setDragOffset(newOffset);
  };

  const handleTouchEnd = () => {
    if (!buttonRef.current || isBookingFinalized || isRedeeming) {
      setIsDragging(false);
      setDragStartX(0);
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const threshold = buttonRect.width * 0.75;

    if (dragOffset > threshold) {
      setDragOffset(buttonRect.width - 80);
      handleRedeemBooking();
    } else {
      setDragOffset(0);
    }

    setIsDragging(false);
    setDragStartX(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isBookingFinalized || isRedeeming) return;
    e.preventDefault();
    setDragStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !buttonRef.current || isBookingFinalized || isRedeeming) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const maxDrag = buttonRect.width - 80;

    // Calculate offset based on the drag distance from start
    const dragDistance = e.clientX - dragStartX;
    const newOffset = Math.max(0, Math.min(dragDistance, maxDrag));

    setDragOffset(newOffset);
  };

  const handleMouseUp = () => {
    if (!buttonRef.current || isBookingFinalized || isRedeeming) {
      setIsDragging(false);
      setDragStartX(0);
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const threshold = buttonRect.width * 0.75;

    if (dragOffset > threshold) {
      setDragOffset(buttonRect.width - 80);
      handleRedeemBooking();
    } else {
      setDragOffset(0);
    }

    setIsDragging(false);
    setDragStartX(0);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const swipeProgress = buttonRef.current
    ? dragOffset / (buttonRef.current.getBoundingClientRect().width - 80)
    : 0;

  if (view === 'completed') {
    return (
      <BookingCompleted
        onContinue={onBack}
        onBookingChanged={onBookingChanged}
        savings={bookingSavings}
        totalSavings={totalSavings}
        merchantId={booking.merchantId}
        merchantName={booking.name}
        merchantImage={booking.image}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto flex flex-col">
          <div className="relative h-80 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
            {booking.image ? (
              <img
                src={booking.image}
                alt={booking.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}

            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <button
                onClick={onNavigateToMap || onBack}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              >
                <X className="w-6 h-6 text-gray-800" />
              </button>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-6'
                        : 'bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-t-[2rem] -mt-6 relative z-10 px-6 pt-6 flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 flex-1 pr-4">
                  {booking.name}
                </h1>
                <button
                  onClick={() => setShowDealNoteModal(true)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <Info className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-4 bg-gray-50 p-4 rounded-2xl">
                <img src="/9295138671579770860 copy.svg" alt="Deal info" className="w-8 h-8 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    {booking.dealTitle || booking.deal || '2 for 1 main course'}
                  </h3>
                  {booking.dealDescription && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {booking.dealDescription}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  const address = encodeURIComponent(booking.address);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                }}
                className="flex items-center justify-between w-full pl-[15px] pr-0 py-2 transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-700 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{booking.address}</p>
                    {booking.city && (
                      <p className="text-xs text-gray-500 mt-0.5">{booking.city}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-full text-sm font-medium flex-shrink-0">
                  <span>Route</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="currentColor"/>
                  </svg>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-3 px-4 py-3 bg-white rounded-2xl">
                  <Calendar className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Sunday</p>
                    <p className="text-sm font-semibold text-gray-900">{booking.date}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-4 py-3 bg-white rounded-2xl">
                  <Clock className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Time</p>
                    <p className="text-sm font-semibold text-gray-900">{booking.time}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 pb-[15px] mt-8">
              <div
                ref={buttonRef}
                className="w-full rounded-[1.5rem] p-1 relative overflow-hidden mb-4 select-none"
                style={{
                  background: isBookingFinalized
                    ? '#9ca3af'
                    : isRedeeming
                    ? 'linear-gradient(90deg, #86efac 0%, #4ade80 100%)'
                    : isDragging
                    ? `linear-gradient(90deg, #86efac 0%, #86efac ${swipeProgress * 100}%, #f3f4f6 ${swipeProgress * 100}%, #f3f4f6 100%)`
                    : '#f3f4f6',
                  transition: isDragging ? 'none' : 'background 0.3s ease-out',
                  cursor: isBookingFinalized ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    opacity: isDragging ? Math.max(0.3, 1 - swipeProgress * 1.2) : 1,
                    transition: isDragging ? 'opacity 0.1s ease-out' : 'opacity 0.3s ease-out'
                  }}
                >
                  <span
                    className="text-base font-bold"
                    style={{
                      color: isBookingFinalized
                        ? '#ffffff'
                        : isRedeeming
                        ? '#ffffff'
                        : isDragging && swipeProgress > 0.35
                        ? '#ffffff'
                        : '#111827',
                      transition: 'color 0.2s ease-out'
                    }}
                  >
                    {isBookingFinalized
                      ? (booking.status === 'complete' || booking.status === 'completed')
                        ? '✓ Already Redeemed'
                        : '✗ Cancelled'
                      : isRedeeming
                      ? '✓ Completed!'
                      : 'Swipe to redeem'}
                  </span>
                </div>
                <div
                  className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translateX(${dragOffset}px) scale(${isDragging ? 1.05 : 1})`,
                    transition: isDragging ? 'transform 0.05s ease-out, background-color 0.1s ease-out, box-shadow 0.1s ease-out' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isBookingFinalized
                      ? '#6b7280'
                      : isRedeeming
                      ? '#22c55e'
                      : isDragging && swipeProgress > 0
                      ? `rgb(${Math.floor(255 - swipeProgress * 221)}, ${Math.floor(163 - swipeProgress * 66)}, ${Math.floor(116 - swipeProgress * 22)})`
                      : 'rgb(255, 163, 116)',
                    boxShadow: isBookingFinalized
                      ? 'none'
                      : isRedeeming
                      ? '0 4px 24px rgba(34, 197, 94, 0.6)'
                      : isDragging
                      ? `0 4px 20px rgba(${Math.floor(255 - swipeProgress * 221)}, ${Math.floor(163 - swipeProgress * 66)}, ${Math.floor(116 - swipeProgress * 22)}, ${0.5 + swipeProgress * 0.3})`
                      : '0 2px 8px rgba(255, 163, 116, 0.3)'
                  }}
                >
                  {isBookingFinalized ? (
                    (booking.status === 'complete' || booking.status === 'completed') ? (
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <X className="w-7 h-7 text-white" />
                    )
                  ) : isRedeeming ? (
                    <svg className="w-7 h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <ArrowRight className="w-7 h-7 text-white" />
                  )}
                </div>
              </div>

              <button
                onClick={handleCancelBooking}
                disabled={isCancelling || isRedeeming}
                className="w-full text-center text-gray-700 font-medium text-base hover:text-gray-900 transition-colors flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
                <span>{isCancelling ? 'Cancelling...' : 'Cancel this booking'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDealNoteModal && <DealNoteModal onClose={() => setShowDealNoteModal(false)} />}
    </div>
  );
}
