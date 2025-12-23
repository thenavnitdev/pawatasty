import { ChevronLeft, MapPin, Clock, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import HistoryDetails from './HistoryDetails';
import ReportPowerBankModal from './ReportPowerBankModal';
import { bookingsEdgeAPI } from '../services/mobile/bookingsEdge';
import { getOptimizedImageUrl } from '../utils/imageUtils';

interface HistoryItem {
  id: string;
  type: 'rental' | 'dining';
  name: string;
  address: string;
  date: string;
  time: string;
  status: 'active' | 'complete' | 'cancelled' | 'lost';
  amount: number;
  image?: string;
  pickupLocation?: string;
  returnLocation?: string;
  pickupCoordinates?: { lat: number; lng: number };
  returnCoordinates?: { lat: number; lng: number };
  deal?: string;
  powerBankId?: string;
  rentalFee?: number;
  lateFee?: number;
  receiptNumber?: string;
  returnDate?: string;
  returnTime?: string;
  merchantId?: string;
}

interface HistoryProps {
  onBack: () => void;
  onOpenHelpCenter?: () => void;
  onNavigateToMerchant?: (merchantId: string) => void;
  onNavigateToMap?: () => void;
}

export default function History({ onBack, onOpenHelpCenter, onNavigateToMerchant, onNavigateToMap }: HistoryProps) {
  const [selectedBooking, setSelectedBooking] = useState<HistoryItem | null>(null);
  const [pastBookings, setPastBookings] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportPowerBank, setShowReportPowerBank] = useState(false);

  useEffect(() => {
    const loadHistoryBookings = async () => {
      try {
        const response = await bookingsEdgeAPI.getUserBookings();

        // Only show completed, cancelled, and expired bookings in history
        const historyBookings = response.bookings
          .filter(b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'expired')
          .map(b => {
            const completedDate = b.status === 'completed' && b.completedAt
              ? new Date(b.completedAt)
              : null;
            const completedTime = completedDate
              ? completedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
              : '';

            // Format completed date as "26-Oct-2025"
            const formattedCompletedDate = completedDate
              ? `${completedDate.getDate().toString().padStart(2, '0')}-${completedDate.toLocaleString('en-GB', { month: 'short' })}-${completedDate.getFullYear()}`
              : undefined;

            return {
              id: b.id,
              type: 'dining' as const,
              name: b.merchant?.name || b.restaurant?.name || 'Restaurant',
              address: b.merchant?.address || b.restaurant?.address || '',
              date: new Date(b.bookingDate || b.booking_date || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              time: (b.booking_time || '').split(' - ')[0] || '',
              status: b.status === 'completed' ? 'complete' as const :
                      b.status === 'cancelled' ? 'cancelled' as const :
                      b.status === 'expired' ? 'complete' as const :
                      'cancelled' as const,
              amount: 0.00,
              deal: b.deal?.title || '2 for 1 main course',
              image: b.dealImage || b.deal?.image || '',
              receiptNumber: b.id,
              returnDate: formattedCompletedDate,
              returnTime: completedTime,
              merchantId: b.merchantId,
            };
          });

        setPastBookings(historyBookings);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistoryBookings();
  }, []);

  const activeBookings: HistoryItem[] = [];

  if (selectedBooking) {
    return (
      <>
        <HistoryDetails
          booking={selectedBooking}
          onBack={() => setSelectedBooking(null)}
          onOpenHelpCenter={onOpenHelpCenter}
          onNavigateToMerchant={onNavigateToMerchant}
          onNavigateToMap={onNavigateToMap}
          onOpenReportPowerBank={() => setShowReportPowerBank(true)}
        />
        {showReportPowerBank && (
          <ReportPowerBankModal
            onClose={() => setShowReportPowerBank(false)}
            defaultCategory="Lost / Found"
          />
        )}
      </>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-orange-500';
      case 'complete': return 'text-green-600';
      case 'cancelled': return 'text-red-500';
      case 'lost': return 'text-red-500';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'complete': return 'Complete';
      case 'cancelled': return 'Cancelled';
      case 'lost': return 'Lost';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto">
          <div className="sticky top-0 bg-gray-50 z-10 px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <h1 className="text-lg font-semibold text-gray-800">History</h1>
              <button
                onClick={onNavigateToMap}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-6">
            {activeBookings.length > 0 && (
              <div className="mb-6">
                {activeBookings.map((booking) => {
                  const coords = booking.pickupCoordinates;
                  const mapUrl = coords
                    ? `https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=15&size=400x200&scale=2&style=feature:poi|visibility:off&style=feature:transit|visibility:off&key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg`
                    : "https://maps.googleapis.com/maps/api/staticmap?center=40.733,-73.989&zoom=12&size=400x200&scale=2&style=feature:poi|visibility:off&style=feature:transit|visibility:off&key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg";

                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="bg-white rounded-3xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-4"
                    >
                      {booking.type === 'rental' ? (
                        <div className="relative h-32 overflow-hidden" style={{
                          background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%, #f0f4f8 100%)',
                          backgroundSize: '200% 200%'
                        }}>
                          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                            <path d="M0,50 Q100,30 200,60 T400,50" fill="none" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4"/>
                            <path d="M50,0 Q80,100 120,130" fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.3"/>
                            <circle cx="60" cy="40" r="3" fill="#94a3b8" opacity="0.4"/>
                            <circle cx="140" cy="70" r="2.5" fill="#94a3b8" opacity="0.4"/>
                            <circle cx="200" cy="55" r="2" fill="#94a3b8" opacity="0.4"/>
                          </svg>

                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-2">
                            <svg width="32" height="40" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                              <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0ZM12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11Z" fill="#F97316"/>
                              <circle cx="12" cy="8" r="2.5" fill="white"/>
                            </svg>
                          </div>
                          <div className="absolute top-3 right-3 z-10">
                            <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                              Active
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-32 bg-orange-100">
                          <div className="absolute top-3 right-3 z-10">
                            <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                              Active
                            </span>
                          </div>
                        </div>
                      )}

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">Picked Up:</h3>
                          <p className="text-sm text-gray-600">{booking.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">{booking.date}</p>
                          <p className="text-sm text-gray-600">{booking.time}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{booking.address}</span>
                      </div>

                      <button className="w-full bg-slate-700 text-white font-semibold py-3 rounded-[1rem] hover:bg-slate-800 transition-colors">
                        How to Return
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading history...</p>
              </div>
            ) : pastBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No past bookings</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Past</h2>
                <div className="space-y-3">
                  {pastBookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex gap-4"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {booking.type === 'dining' && booking.image ? (
                        <img
                          src={getOptimizedImageUrl(booking.image, 'deal', { width: 128, height: 128, quality: 85 })}
                          alt={booking.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img src="/6.png" alt={booking.name} className="w-full h-full object-contain" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 mb-1 truncate">{booking.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                        <span>{booking.date}</span>
                        <span>•</span>
                        <span>{booking.time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium capitalize ${getStatusColor(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs font-semibold text-gray-800">€ {booking.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (booking.type === 'dining' && booking.merchantId && onNavigateToMerchant) {
                          onNavigateToMerchant(booking.merchantId);
                        } else if (booking.type === 'rental' && onNavigateToMap) {
                          onNavigateToMap();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors self-start"
                    >
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Repeat</span>
                    </button>
                  </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
