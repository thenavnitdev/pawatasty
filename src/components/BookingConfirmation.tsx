import { Calendar, Clock } from 'lucide-react';
import { Booking, Restaurant } from '../types';

interface BookingConfirmationProps {
  booking: Booking;
  restaurant: Restaurant;
  onGoToBookings: () => void;
  onExploreMore: () => void;
}

export default function BookingConfirmation({
  booking,
  restaurant,
  onGoToBookings,
  onExploreMore,
}: BookingConfirmationProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-md px-4 flex flex-col h-full">
        <div className="text-center flex-1 flex flex-col justify-center">
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="text-8xl">🎁</div>
              <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🎉</div>
              <div className="absolute -bottom-2 -left-2 text-3xl animate-pulse">✨</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-4">CONGRATULATIONS!</h1>
          <p className="text-gray-600 mb-2">Your booking is confirmed at:</p>
          <h2 className="text-3xl font-bold text-orange-400 mb-6">{restaurant.name}</h2>

          <p className="text-gray-600 mb-8">{restaurant.address}</p>

          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="bg-white rounded-2xl p-3 mb-2 shadow-sm">
                <Calendar className="w-6 h-6 text-orange-400" />
              </div>
              <p className="font-semibold text-slate-800">{formatDate(booking.booking_date).split(' ')[0]}</p>
              <p className="text-sm text-gray-600">{formatDate(booking.booking_date).split(' ').slice(1).join(' ')}</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white rounded-2xl p-3 mb-2 shadow-sm">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <p className="font-semibold text-slate-800">Time</p>
              <p className="text-sm text-gray-600">{booking.booking_time}</p>
            </div>
          </div>
        </div>

        <div className="pb-[30px]">
          <button
            onClick={onGoToBookings}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-[1rem] font-semibold hover:from-orange-500 hover:to-orange-600 transition-all shadow-md mb-4"
          >
            Go to bookings
          </button>

          <button
            onClick={onExploreMore}
            className="w-full bg-white text-gray-700 py-4 rounded-[1rem] font-semibold hover:bg-gray-50 transition-all shadow-lg"
          >
            Explore more!
          </button>
        </div>
      </div>
    </div>
  );
}
