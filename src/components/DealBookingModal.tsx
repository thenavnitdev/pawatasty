import { Ticket, DollarSign, MapPin } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { bookingsEdgeAPI } from '../services/mobile';
import BookingErrorModal from './BookingErrorModal';
import FlexPlanUpgradeModal from './FlexPlanUpgradeModal';
import { Deal } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { supabase } from '../lib/supabase';

interface DealBookingModalProps {
  deal: Deal;
  restaurant: {
    id: string;
    name: string;
    address: string;
    image: string;
    openingHours?: string;
    open_days?: string;
    open_time?: string;
  };
  onClose: () => void;
  onBookingComplete: (bookingData: any, restaurant: any) => void;
}

interface MerchantSchedule {
  [key: string]: { open: string; close: string };
}

interface ExistingBooking {
  date: string;
  time: string;
}

export default function DealBookingModal({ deal, restaurant, onClose, onBookingComplete }: DealBookingModalProps) {
  const [selectedDay, setSelectedDay] = useState('Today');
  const [selectedTime, setSelectedTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [userSubscription, setUserSubscription] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const remainingBookings = deal.bookable_qty ?? 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Parse merchant opening hours (format: "Mon-Fri: 12:00-22:00, Sat-Sun: 10:00-23:00")
  const merchantSchedule = useMemo<MerchantSchedule>(() => {
    if (!restaurant.openingHours) {
      return {
        Monday: { open: '12:00', close: '22:00' },
        Tuesday: { open: '12:00', close: '22:00' },
        Wednesday: { open: '12:00', close: '22:00' },
        Thursday: { open: '12:00', close: '22:00' },
        Friday: { open: '12:00', close: '22:00' },
        Saturday: { open: '12:00', close: '22:00' },
        Sunday: { open: '12:00', close: '22:00' },
      };
    }
    // Parse opening hours string into schedule object
    const schedule: MerchantSchedule = {};
    const segments = restaurant.openingHours.split(',').map(s => s.trim());
    segments.forEach(segment => {
      const [days, hours] = segment.split(':').map(s => s.trim());
      if (!hours) return;
      const [open, close] = hours.split('-').map(s => s.trim());
      if (days.includes('-')) {
        const [start, end] = days.split('-').map(s => s.trim());
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const startIdx = dayNames.findIndex(d => start.startsWith(d.substring(0, 3)));
        const endIdx = dayNames.findIndex(d => end.startsWith(d.substring(0, 3)));
        for (let i = startIdx; i <= endIdx; i++) {
          schedule[dayNames[i]] = { open, close };
        }
      } else {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames.find(d => days.startsWith(d.substring(0, 3)));
        if (dayName) schedule[dayName] = { open, close };
      }
    });
    return schedule;
  }, [restaurant.openingHours]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsCheckingSubscription(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No authenticated user found');
          setIsCheckingSubscription(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('subscription')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching user subscription:', userError);
        } else if (userData) {
          const subscription = userData.subscription || 'flex';
          console.log('User subscription:', subscription);
          setUserSubscription(subscription);

          if (subscription === 'flex') {
            console.log('Flex plan user detected - showing upgrade modal');
            setShowUpgradeModal(true);
          }
        }

        setIsCheckingSubscription(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setIsCheckingSubscription(false);
      }
    };

    const loadBookings = async () => {
      try {
        const response = await bookingsEdgeAPI.getUserBookings();
        const bookings = response.bookings
          .filter(b => b.dealId === deal.id && b.status !== 'cancelled')
          .map(b => ({
            date: new Date(b.bookingDate || b.booking_date || '').toDateString(),
            time: b.specialRequests || b.booking_time || ''
          }));
        setExistingBookings(bookings);
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    loadUserData();
    loadBookings();
  }, [deal.id]);

  // Calculate available days based on merchant schedule
  const availableDays = useMemo(() => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days: { label: string; date: Date; dayName: string }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayName = dayNames[date.getDay()];

      // Check if merchant is open on this day
      if (merchantSchedule[dayName]) {
        const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName;
        days.push({ label, date, dayName });
      }
    }

    return days.slice(0, 4); // Show max 4 days
  }, [merchantSchedule]);

  // Get time slots based on merchant hours and filter out past times for today
  const getAvailableTimeSlots = useMemo(() => {
    const selectedDayInfo = availableDays.find(d => d.label === selectedDay);
    if (!selectedDayInfo) return [];

    const schedule = merchantSchedule[selectedDayInfo.dayName];
    if (!schedule) return [];

    const now = new Date();
    const isToday = selectedDayInfo.label === 'Today';
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Generate time slots based on merchant hours
    const slots: string[] = [];
    const openHour = parseInt(schedule.open.split(':')[0]);
    const closeHour = parseInt(schedule.close.split(':')[0]);

    // Standard meal periods
    if (openHour <= 13 && closeHour >= 17) slots.push('13:00 - 17:00'); // Lunch/Afternoon
    if (openHour <= 18 && closeHour >= 21) slots.push('18:00 - 21:00'); // Dinner
    if (openHour <= 22 || closeHour >= 1) slots.push('22:00 - 01:00'); // Late night

    // Filter out past times if today
    return slots.filter(slot => {
      if (!isToday) return true;

      const slotStartHour = parseInt(slot.split(':')[0]);
      const slotStartMinute = parseInt(slot.split(':')[1].split(' ')[0]);

      // Check if slot start time is in the future
      if (slotStartHour > currentHour) return true;
      if (slotStartHour === currentHour && slotStartMinute > currentMinute) return true;

      return false;
    }).filter(slot => {
      // Filter out already booked slots for this day
      const bookingDate = selectedDayInfo.date.toDateString();
      return !existingBookings.some(b => b.date === bookingDate && b.time === slot);
    });
  }, [selectedDay, availableDays, merchantSchedule, existingBookings]);

  // Reset selected time if it becomes unavailable
  useEffect(() => {
    if (selectedTime && !getAvailableTimeSlots.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [selectedTime, getAvailableTimeSlots]);

  const handleBooking = async () => {
    console.log('🎯 Book button clicked!');
    console.log('Selected time:', selectedTime);
    console.log('Selected day:', selectedDay);
    console.log('User subscription:', userSubscription);

    if (userSubscription === 'flex') {
      console.log('❌ Flex plan user attempting to book - showing upgrade modal');
      setShowUpgradeModal(true);
      return;
    }

    if (!selectedTime) {
      console.error('❌ No time selected!');
      setErrorMessage('Please select a time slot');
      setShowError(true);
      return;
    }

    console.log('✅ Time is selected, proceeding...');

    // Validate the booking isn't in the past
    const selectedDayInfo = availableDays.find(d => d.label === selectedDay);
    console.log('Selected day info:', selectedDayInfo);

    if (!selectedDayInfo) {
      console.error('❌ Invalid day selected!');
      setErrorMessage('Invalid day selected');
      setShowError(true);
      return;
    }

    const now = new Date();
    const isToday = selectedDayInfo.label === 'Today';
    if (isToday) {
      const slotStartHour = parseInt(selectedTime.split(':')[0]);
      const currentHour = now.getHours();
      if (slotStartHour <= currentHour) {
        setErrorMessage('This time slot has already passed. Please select a future time.');
        setShowError(true);
        return;
      }
    }

    // Check for double booking
    const bookingDateStr = selectedDayInfo.date.toDateString();
    console.log('Checking for existing bookings:', { bookingDateStr, selectedTime, existingBookings });

    if (existingBookings.some(b => b.date === bookingDateStr && b.time === selectedTime)) {
      console.error('❌ Double booking detected!');
      setErrorMessage('You already have a booking for this time slot. Please choose a different time.');
      setShowError(true);
      return;
    }

    console.log('✅ Starting booking process...');
    setIsBooking(true);
    try {
      const bookingDate = selectedDayInfo.date;

      console.log('📤 Calling bookDeal API with:', {
        dealId: deal.id,
        dealIdType: typeof deal.id,
        bookingDate: bookingDate.toISOString(),
        guests: 1,
        specialRequests: selectedTime
      });

      console.log('🔍 Full deal object:', deal);
      console.log('🖼️ Deal image being sent:', deal.image || restaurant.image);

      const data = await bookingsEdgeAPI.bookDeal(deal.id, {
        bookingDate: bookingDate.toISOString(),
        guests: 1,
        specialRequests: selectedTime,
        restaurantId: restaurant.id
      });

      console.log('✅ Booking API response:', data);
      console.log('🎉 Booking created successfully! Redirecting to confirmation...');

      // Close the booking modal immediately
      onClose();

      // Trigger the booking complete callback with full booking data
      onBookingComplete(data, restaurant);
    } catch (error: any) {
      console.error('❌ Booking error:', error);
      console.error('   Error type:', typeof error);
      console.error('   Error message:', error.message);
      console.error('   Error response:', error.response);

      // Better error messages
      let message = 'Failed to book deal. Please try again.';

      // Check for specific error types
      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        message = 'Session expired. Please log in again.';
      } else if (error.message?.includes('already booked')) {
        message = 'This time slot is no longer available. Please select a different time.';
      } else if (error.message?.includes('network') || error.message?.includes('NetworkError')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('authentication')) {
        message = 'Authentication failed. Please log in again.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        // Include the actual error message for debugging
        message = `Booking failed: ${error.message}`;
      }

      console.error('   Showing error to user:', message);
      setErrorMessage(message);
      setShowError(true);
    } finally {
      setIsBooking(false);
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-md rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ transform: `translateY(${currentY}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sticky top-0 bg-white z-10 pt-6 pb-2">
        </div>

        <div className="relative h-48 bg-gray-200 mb-4">
          <img
            src={getOptimizedImageUrl(deal.image || deal.imageUrl || restaurant.image, 'deal', { width: 448, height: 192, quality: 85 })}
            alt={deal.title}
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="px-5 pb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {deal.title.replace('2 for 1 Berg Menu', '2 for 1 main course')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">{deal.description}</p>

          <div className="flex flex-wrap gap-3 mb-6">
            {remainingBookings > 0 && (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <Ticket className="w-4 h-4" />
                <span>{remainingBookings} Remains</span>
              </div>
            )}
            {deal.savings && deal.savings > 0 && (
              <div className="flex items-center gap-2 text-xs font-medium text-[#334155]">
                <span className="text-sm">€{deal.savings} Benefit</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20.924 5.617a1 1 0 0 0-.217-.324l-3-3a1 1 0 1 0-1.414 1.414L17.586 5H8a5 5 0 0 0-5 5v2a1 1 0 1 0 2 0v-2a3 3 0 0 1 3-3h9.586l-1.293 1.293a1 1 0 0 0 1.414 1.414l3-3A1 1 0 0 0 21 6m-.076-.383a1 1 0 0 1 .076.38zm-17.848 12a1 1 0 0 0 .217 1.09l3 3a1 1 0 0 0 1.414-1.414L6.414 19H16a5 5 0 0 0 5-5v-2a1 1 0 1 0-2 0v2a3 3 0 0 1-3 3H6.414l1.293-1.293a1 1 0 1 0-1.414-1.414l-3 3m-.217.324a1 1 0 0 1 .215-.322z"/></svg>
              <span>{deal.duration} Days</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <MapPin className="w-4 h-4" />
              <span>On-site</span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2.5">Select day</h3>
            {isLoadingBookings ? (
              <div className="text-center py-4 text-gray-500">Loading available days...</div>
            ) : availableDays.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No available days. Merchant may be closed.</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableDays.map((day) => (
                  <button
                    key={day.label}
                    onClick={() => {
                      console.log('📅 Day selected:', day.label, 'Date:', day.date);
                      setSelectedDay(day.label);
                    }}
                    className={`py-2.5 px-2 rounded-2xl text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedDay === day.label
                        ? 'bg-slate-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5">
            <h3 className="font-semibold text-gray-800 mb-2.5">
              Select time
              {selectedDay === 'Today' && <span className="text-xs text-gray-500 ml-2">(Past times hidden)</span>}
            </h3>
            {isLoadingBookings ? (
              <div className="text-center py-4 text-gray-500">Loading available times...</div>
            ) : getAvailableTimeSlots.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {selectedDay === 'Today' ? 'No more time slots available today. Try tomorrow!' : 'No available times for this day.'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {getAvailableTimeSlots.map((time) => {
                  const isBooked = existingBookings.some(
                    b => b.date === availableDays.find(d => d.label === selectedDay)?.date.toDateString() && b.time === time
                  );
                  return (
                    <button
                      key={time}
                      onClick={() => {
                        console.log('⏰ Time selected:', time);
                        setSelectedTime(time);
                      }}
                      disabled={isBooked}
                      className={`py-2 px-2 rounded-2xl text-xs font-medium transition-colors ${
                        isBooked
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed line-through'
                          : selectedTime === time
                          ? 'bg-slate-700 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              console.log('🔘 Book button CLICKED', { selectedTime, selectedDay, isBooking, userSubscription });
              handleBooking();
            }}
            disabled={!selectedTime || isBooking || isCheckingSubscription || userSubscription === 'flex'}
            className={`w-full font-semibold py-4 rounded-[1rem] transition-all ${
              selectedTime && !isBooking && !isCheckingSubscription && userSubscription !== 'flex'
                ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isCheckingSubscription
              ? 'Loading...'
              : isBooking
                ? 'Booking...'
                : userSubscription === 'flex'
                  ? 'Become a Member'
                  : 'Book this deal'}
          </button>
        </div>
      </div>

      <BookingErrorModal
        isOpen={showError}
        onClose={() => setShowError(false)}
        message={errorMessage}
      />

      <FlexPlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          onClose();
        }}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          onClose();
          window.dispatchEvent(new CustomEvent('navigate-to-membership'));
        }}
      />
    </div>
  );
}
