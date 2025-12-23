import { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, Clock, Users, X, MapPin, ChevronDown } from 'lucide-react';
import { Restaurant } from '../types';

interface BookingFormProps {
  restaurant: Restaurant;
  userId: string;
  onBack: () => void;
  onBookingComplete: (bookingId: string) => void;
}

export default function BookingForm({ restaurant, userId, onBack, onBookingComplete }: BookingFormProps) {
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [bookingType, setBookingType] = useState<'single' | 'group'>('single');
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Restaurant[]>([restaurant]);
  const [selectedLocation, setSelectedLocation] = useState<Restaurant>(restaurant);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/merchants?select=*&name=eq.${encodeURIComponent(restaurant.name)}`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        if (response.ok) {
          const sameNameLocations = await response.json();
          if (sameNameLocations.length > 1) {
            setLocations(sameNameLocations);
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    fetchLocations();
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      alert('Table booking feature will be available once the restaurant has deals. Please use the Discover section to book available deals!');
      onBack();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50 overflow-hidden">
      <div className="h-full overflow-y-auto px-5 py-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">Book a Table</h2>
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="relative h-48 bg-gradient-to-br from-orange-400 to-pink-400 rounded-2xl mb-4 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 text-center px-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 mx-auto shadow-lg">
                <MapPin className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-white font-semibold text-lg leading-relaxed">
                {selectedLocation.address || 'Address not available'}
              </p>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{restaurant.name}</h3>
          {locations.length > 1 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLocationSelector(!showLocationSelector)}
                className="w-full flex items-start gap-2 text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-800 text-sm font-medium">{selectedLocation.address}</p>
                  <p className="text-xs text-gray-500 mt-1">{locations.length} locations available</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${showLocationSelector ? 'rotate-180' : ''}`} />
              </button>
              {showLocationSelector && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-10 max-h-60 overflow-y-auto">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setShowLocationSelector(false);
                      }}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedLocation.id === loc.id ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          selectedLocation.id === loc.id ? 'text-orange-500' : 'text-gray-400'
                        }`} />
                        <p className={`text-sm ${
                          selectedLocation.id === loc.id ? 'text-orange-600 font-medium' : 'text-gray-700'
                        }`}>{loc.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">{restaurant.address}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="flex items-center gap-3 mb-3 text-gray-700 font-semibold">
              <Calendar className="w-5 h-5 text-orange-500" />
              Select Date
            </label>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
              className="w-full p-3 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="flex items-center gap-3 mb-3 text-gray-700 font-semibold">
              <Clock className="w-5 h-5 text-orange-500" />
              Select Time
            </label>
            <input
              type="time"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              required
              className="w-full p-3 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="flex items-center gap-3 mb-3 text-gray-700 font-semibold">
              <Users className="w-5 h-5 text-orange-500" />
              Party Size
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full font-bold hover:bg-orange-200 transition-colors"
              >
                -
              </button>
              <span className="text-2xl font-bold text-gray-800 min-w-[3rem] text-center">{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize(Math.min(20, partySize + 1))}
                className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full font-bold hover:bg-orange-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="text-gray-700 font-semibold mb-3 block">Booking Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBookingType('single')}
                className={`flex-1 py-3 rounded-[1rem] font-semibold transition-all ${
                  bookingType === 'single'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setBookingType('group')}
                className={`flex-1 py-3 rounded-[1rem] font-semibold transition-all ${
                  bookingType === 'group'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Group
              </button>
            </div>
          </div>

          <div className="bg-orange-50 rounded-2xl p-4 border-2 border-orange-200">
            <p className="text-sm font-bold text-orange-800 mb-1">🎉 Special Offer Applied!</p>
            <p className="text-xs text-gray-700">You'll get 2 for 1 on all main courses with this booking</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-[1rem] font-bold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
