import React from 'react';
import { ChevronLeft, Users, Calendar, Clock, MessageCircle, ChevronRight } from 'lucide-react';
import { Booking } from '../types';

interface BookingsWeekViewProps {
  bookings: Booking[];
  onBack: () => void;
  onBookingClick: (bookingId: string) => void;
  onOpenHistory: () => void;
}

export default function BookingsWeekView({ bookings, onBack, onBookingClick, onOpenHistory }: BookingsWeekViewProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const getCurrentWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDay + (currentWeekOffset * 7));

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getCurrentWeekDates();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return 'This week';
    if (currentWeekOffset === 1) return 'Next week';
    if (currentWeekOffset === -1) return 'Last week';
    if (currentWeekOffset > 0) return `+${currentWeekOffset} weeks`;
    return `${currentWeekOffset} weeks`;
  };

  const monthName = weekDates[0].toLocaleString('default', { month: 'long', year: 'numeric' });

  const getColorForDay = (index: number) => {
    const colors = ['bg-orange-100', 'bg-green-100', 'bg-blue-100', 'bg-yellow-100', 'bg-gray-100', 'bg-purple-100', 'bg-pink-100'];
    return colors[index % colors.length];
  };

  const getUpcomingBookingsByDate = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today
    const upcomingBookings = bookings.filter(b => {
      const bookingDate = new Date(b.booking_date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate >= now;
    });

    const groupedByDate = upcomingBookings.reduce((acc, booking) => {
      const dateKey = new Date(booking.booking_date).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
      return acc;
    }, {} as Record<string, typeof bookings>);

    return Object.entries(groupedByDate)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .map(([date, bookingsForDate]) => ({
        date: new Date(date),
        bookings: bookingsForDate.sort((a, b) => a.booking_time.localeCompare(b.booking_time))
      }));
  };

  const upcomingBookingsByDate = getUpcomingBookingsByDate();

  const hasBookingsOnDate = (date: Date) => {
    const dateStr = date.toDateString();
    return bookings.some(b => new Date(b.booking_date).toDateString() === dateStr);
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return bookings.filter(b => new Date(b.booking_date).toDateString() === dateStr)
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time));
  };

  const displayedBookings = selectedDate
    ? [{ date: selectedDate, bookings: getBookingsForDate(selectedDate) }].filter(g => g.bookings.length > 0)
    : upcomingBookingsByDate;

  // Only count UPCOMING bookings (future dates)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= now;
  });

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
        <div className="bg-white" style={{ borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}>

        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{totalBookings} Bookings</h2>
        </div>

        {totalBookings > 0 ? (
          <div className="px-4 mb-4">
            <div className="flex gap-3">
              {upcomingBookingsByDate.length > 0 && upcomingBookingsByDate[0].bookings.length > 0 && (
                <div
                  className="bg-orange-100 rounded-2xl p-4 flex-shrink-0 w-[250px] cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onBookingClick(upcomingBookingsByDate[0].bookings[0].id)}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <Users className="w-4 h-4" />
                    <span className="text-sm line-clamp-1">{upcomingBookingsByDate[0].bookings[0].deal_description || 'Booking'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                    <Clock className="w-4 h-4 ml-2" />
                    <span>Time</span>
                  </div>
                  <div className="text-sm mb-3">
                    {new Date(upcomingBookingsByDate[0].bookings[0].booking_date).toLocaleDateString('en-GB')} {upcomingBookingsByDate[0].bookings[0].booking_time}
                  </div>
                  <p className="font-bold text-base line-clamp-1">{upcomingBookingsByDate[0].bookings[0].restaurant?.name || 'Restaurant'}</p>
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

        <div className="px-4 grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const hasBookings = hasBookingsOnDate(weekDates[index]);
            const isSelected = selectedDate?.toDateString() === weekDates[index].toDateString();
            return (
              <button
                key={index}
                onClick={() => {
                  if (hasBookings) {
                    setSelectedDate(isSelected ? null : weekDates[index]);
                  }
                }}
                className={`${getColorForDay(index)} rounded-lg px-2 py-2 text-center relative transition-all ${
                  hasBookings ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="text-[11px] font-medium text-[#334155]">{day}</div>
                <div className="text-sm font-bold text-[#334155]">{weekDates[index].getDate()}</div>
                {hasBookings && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        </div>

        <div className="px-4 mt-6 pb-28">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Upcoming plan</h3>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filter
              </button>
            )}
          </div>

          {displayedBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No bookings in your calendar.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedBookings.map((dateGroup, dateIndex) => (
                <div key={dateIndex}>
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    {dateGroup.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="space-y-2">
                    {dateGroup.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => onBookingClick(booking.id)}
                        className={`p-3 rounded-xl ${
                          booking.status === 'confirmed' ? 'bg-pink-100' : 'bg-green-100'
                        } cursor-pointer hover:shadow-md transition-shadow`}
                      >
                        <div className="text-xs text-gray-600 mb-1">{booking.booking_type === 'single' ? 'Single' : 'Group'} booking</div>
                        <div className="font-semibold text-sm leading-tight">{booking.restaurant?.name || 'Restaurant'}</div>
                        {booking.restaurant?.address && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{booking.restaurant.address}</div>
                        )}
                        <div className="text-xs text-gray-600 mt-1">
                          {booking.booking_time}
                        </div>
                      </div>
                    ))}
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
