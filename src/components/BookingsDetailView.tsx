import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users } from 'lucide-react';
import { Booking } from '../types';
import { getDealImageUrl } from '../utils/imageUtils';

interface BookingsDetailViewProps {
  bookings: Booking[];
  onBack: () => void;
  onOpenChat: () => void;
  onOpenHistory: () => void;
  onBookingClick?: (bookingId: string) => void;
}

export default function BookingsDetailView({ bookings, onBack, onOpenChat, onOpenHistory, onBookingClick }: BookingsDetailViewProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = React.useState(0);

  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return 'This week';
    if (currentWeekOffset === 1) return 'Next week';
    if (currentWeekOffset === -1) return 'Last week';
    if (currentWeekOffset > 0) return `+${currentWeekOffset} weeks`;
    return `${currentWeekOffset} weeks`;
  };

  const getCurrentWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDay + (currentWeekOffset * 7));
    return startOfWeek;
  };

  const monthName = getCurrentWeekDates().toLocaleString('default', { month: 'long', year: 'numeric' });

  const foodImages = [
    'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1251198/pexels-photo-1251198.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=800',
  ];

  // Filter to show only upcoming bookings (same logic as calendar view)
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to start of today
  const upcomingBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= now;
  }).sort((a, b) => {
    // Sort by date first, then by time
    const dateCompare = new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.booking_time.localeCompare(b.booking_time);
  });

  // Only count UPCOMING bookings
  const totalBookings = upcomingBookings.length;
  const singleBookings = upcomingBookings.filter(b => b.booking_type === 'single').length;
  const groupBookings = upcomingBookings.filter(b => b.booking_type === 'group').length;

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="px-4 pt-6 pb-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button onClick={onOpenHistory} className="font-medium" style={{ color: '#203F55' }}>History</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white pb-6" style={{ borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}>

        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{totalBookings} Bookings</h2>
        </div>

        {totalBookings > 0 ? (
          <div className="px-4 mb-4">
            <div className="flex gap-3">
              {upcomingBookings.length > 0 && upcomingBookings[0] && (
                <div
                  className="bg-orange-100 rounded-2xl p-4 flex-shrink-0 w-[250px] cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onBookingClick?.(upcomingBookings[0].id)}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <Users className="w-4 h-4" />
                    <span className="text-sm line-clamp-1">{upcomingBookings[0].deal_description || 'Booking'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                    <Clock className="w-4 h-4 ml-2" />
                    <span>Time</span>
                  </div>
                  <div className="text-sm mb-3">
                    {new Date(upcomingBookings[0].booking_date).toLocaleDateString('en-GB')} {upcomingBookings[0].booking_time.split(' - ')[0]}
                  </div>
                  <p className="font-bold text-base line-clamp-1">{upcomingBookings[0].restaurant?.name || 'Restaurant'}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="bg-yellow-100 rounded-xl p-2.5 text-center w-[90px]">
                  <div className="text-2xl font-bold text-orange-500">{totalBookings}</div>
                  <div className="text-[10px] text-gray-600">Bookings</div>
                </div>
                <div className="flex gap-2">
                  <div className="bg-pink-100 rounded-xl p-2 text-center flex-1">
                    <div className="text-lg font-bold">{singleBookings}</div>
                    <div className="text-[9px] text-gray-600">Single</div>
                  </div>
                  <div className="bg-pink-200 rounded-xl p-2 text-center flex-1">
                    <div className="text-lg font-bold">{groupBookings}</div>
                    <div className="text-[9px] text-gray-600">Group</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-4 flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800">{getWeekLabel()}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{monthName}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentWeekOffset > 0 && (
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: '#203F55' }}
              >
                <ChevronLeft size={16} />
                Prev
              </button>
            )}
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: '#203F55' }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </div>

        <div className="px-4 mt-6 pb-28">
          <h3 className="font-bold text-gray-800 mb-4">Upcoming plan</h3>

          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No bookings in your calendar.</p>
            </div>
          ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking, index) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => onBookingClick?.(booking.id)}
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={(booking as any).dealImage ? getDealImageUrl((booking as any).dealImage) : foodImages[index % foodImages.length]}
                    alt="Food"
                    className="w-32 h-32 rounded-2xl object-cover"
                    loading={index < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes('pexels.com') && !img.src.includes('unsplash.com')) {
                        img.src = 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=400';
                      }
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 mb-1 leading-tight">{booking.restaurant?.name || 'Restaurant'}</h4>
                    {booking.restaurant?.address && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">{booking.restaurant.address}</p>
                    )}
                    {booking.deal_description && (
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-semibold">Deal:</span> {booking.deal_description}
                      </p>
                    )}

                    <div className="flex gap-4 mb-3">
                      <div className="flex flex-col items-center">
                        <Calendar className="w-5 h-5 text-gray-600 mb-1" />
                        <span className="text-xs text-gray-600">{new Date(booking.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Clock className="w-5 h-5 text-gray-600 mb-1" />
                        <span className="text-xs text-gray-600">{booking.booking_time.split(' - ')[0]}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Users className="w-5 h-5 text-gray-600 mb-1" />
                        <span className="text-xs text-gray-600">{booking.status}</span>
                      </div>
                    </div>

                    <button className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-2 rounded-[1rem] font-semibold text-sm hover:from-orange-500 hover:to-orange-600 transition-all">
                      Redeem
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
