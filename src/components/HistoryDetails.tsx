import { ChevronLeft, MapPin, Receipt as ReceiptIcon, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUtils';

interface HistoryDetailsProps {
  booking: {
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
  };
  onBack: () => void;
  onOpenHelpCenter?: () => void;
  onNavigateToMerchant?: (merchantId: string) => void;
  onNavigateToMap?: () => void;
  onOpenReportPowerBank?: () => void;
}

export default function HistoryDetails({ booking, onBack, onOpenHelpCenter, onNavigateToMerchant, onNavigateToMap, onOpenReportPowerBank }: HistoryDetailsProps) {
  const isRental = booking.type === 'rental';
  const isDining = booking.type === 'dining';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-orange-500';
      case 'complete': return 'text-green-600';
      case 'cancelled': return 'text-gray-500';
      case 'lost': return 'text-red-500';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
              <h1 className="text-lg font-semibold text-gray-800">History Details</h1>
              <div className="w-10" />
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-6">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm mb-6">
              {isRental ? (
                <div className="relative h-48 overflow-hidden" style={{
                  background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%, #f0f4f8 100%)',
                  backgroundSize: '200% 200%'
                }}>
                  <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid-detail-modal" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-detail-modal)" />
                    <path d="M0,80 Q150,60 300,90 T600,80" fill="none" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4"/>
                    <path d="M120,0 Q150,150 210,180" fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.3"/>
                    <circle cx="140" cy="90" r="3" fill="#94a3b8" opacity="0.4"/>
                    <circle cx="260" cy="120" r="2.5" fill="#94a3b8" opacity="0.4"/>
                    <circle cx="340" cy="100" r="2" fill="#94a3b8" opacity="0.4"/>
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="40" height="50" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                      <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0ZM12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11Z" fill="#F97316"/>
                      <circle cx="12" cy="8" r="2.5" fill="white"/>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="relative h-48 bg-gray-200">
                  {booking.image && (
                    <img
                      src={getOptimizedImageUrl(booking.image, 'deal', { width: 800, height: 600, quality: 85 })}
                      alt={booking.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              <div className="p-5">
                {isRental && (
                  <>
                    {booking.powerBankId && (
                      <div className="flex items-start justify-between mb-4">
                        <h2 className="text-2xl font-bold text-slate-800">
                          Power Bank ID: {booking.powerBankId}
                        </h2>
                        <button
                          onClick={() => {
                            if (onNavigateToMap) {
                              onNavigateToMap();
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        >
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span className="text-xs font-medium text-gray-700">Repeat</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {isDining && (
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                      {booking.name.replace(/\d+/g, '').trim() + "'s Rest"}
                    </h2>
                    <button
                      onClick={() => {
                        if (booking.merchantId && onNavigateToMerchant) {
                          onNavigateToMerchant(booking.merchantId);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <Clock className="w-3 h-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700">Repeat</span>
                    </button>
                  </div>
                )}

                {isRental && (
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-800">Picked Up:</h3>
                      <p className="font-semibold text-gray-800">{booking.date}</p>
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-gray-600">
                        {booking.pickupLocation?.split(',')[0] || booking.name}
                      </p>
                      <p className="text-sm text-gray-600">{booking.time}</p>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center pt-1">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-gray-800" />
                        <div className="w-0.5 h-6 bg-gray-300 my-1"></div>
                        <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      </div>
                      <div className="flex-1 text-sm text-gray-600">
                        <p>{booking.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isDining && (
                  <>
                    <div className="flex items-start gap-3 mb-4 bg-gray-50 p-4 rounded-2xl">
                      <img src="/9295138671579770860 copy.svg" alt="Deal info" className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base mb-1">
                          {booking.deal || '2 for 1 main course'}
                        </h3>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="mb-1">
                        <h3 className="font-semibold text-gray-800">Booked:</h3>
                      </div>

                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-gray-600">{booking.name}</p>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">{booking.date}</p>
                          <p className="text-sm text-gray-600">{booking.time}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-gray-800" />
                        <div className="flex-1 text-sm text-gray-600">
                          <p>{booking.address}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isRental && booking.status === 'active' && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-800 mb-1">Returned:</h3>
                    <p className="text-sm text-gray-600 mb-2">Unknown</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-400">---</span>
                    </div>
                  </div>
                )}

                {isRental && booking.status === 'complete' && booking.returnLocation && (
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-800">Returned:</h3>
                      <p className="font-semibold text-gray-800">{booking.returnDate || '05-sep-2022'}</p>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-gray-600">
                        {booking.returnLocation.split(',')[0]}
                      </p>
                      <p className="text-sm text-gray-600">{booking.returnTime || '11:37'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-green-600" />
                      <div className="flex-1 text-sm text-gray-600">
                        <p>{booking.returnLocation}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">Status:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                      {booking.status === 'complete' && booking.returnTime && (
                        <span className="text-sm text-gray-600">{booking.returnTime}</span>
                      )}
                    </div>
                  </div>

                  {isRental && booking.rentalFee !== undefined && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Rental fee:</span>
                        <span>€ {booking.rentalFee.toFixed(2)}</span>
                      </div>
                      {booking.lateFee !== undefined && booking.lateFee > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Late fee:</span>
                          <span>€ {booking.lateFee.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-800">Total:</span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">€ {booking.amount.toFixed(2)}</p>
                      {booking.status === 'complete' && booking.returnDate && (
                        <p className="text-sm text-gray-600">{booking.returnDate}</p>
                      )}
                    </div>
                  </div>

                  {booking.receiptNumber && (
                    <div className="flex justify-between items-center">
                      <button className="flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-colors">
                        <ReceiptIcon className="w-5 h-5" />
                        <span className="font-medium">Receipt</span>
                      </button>
                      <span className="text-sm text-gray-600"># {booking.receiptNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 px-5 pt-5 pb-4">Report</h2>

              <button
                onClick={onOpenReportPowerBank}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg width="23" height="27" viewBox="0 0 23 27" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                      <g clipPath="url(#clip0_1_84350)">
                        <path d="M9.85205 18.75C9.85205 18.4393 9.60021 18.1875 9.28955 18.1875C8.97889 18.1875 8.72705 18.4393 8.72705 18.75L9.28955 18.75L9.85205 18.75ZM9.28955 18.75L8.72705 18.75L8.72705 26.25L9.28955 26.25L9.85205 26.25L9.85205 18.75L9.28955 18.75Z" fill="#25314C"/>
                        <path d="M11.7271 18.75C11.7271 18.4393 11.4752 18.1875 11.1646 18.1875C10.8539 18.1875 10.6021 18.4393 10.6021 18.75L11.1646 18.75L11.7271 18.75ZM11.1646 18.75L10.6021 18.75L10.6021 26.25L11.1646 26.25L11.7271 26.25L11.7271 18.75L11.1646 18.75Z" fill="#25314C"/>
                        <path d="M13.6021 18.75C13.6021 18.4393 13.3502 18.1875 13.0396 18.1875C12.7289 18.1875 12.4771 18.4393 12.4771 18.75L13.0396 18.75L13.6021 18.75ZM13.0396 18.75L12.4771 18.75L12.4771 26.25L13.0396 26.25L13.6021 26.25L13.6021 18.75L13.0396 18.75Z" fill="#25314C"/>
                      </g>
                      <rect x="4.41455" y="0.75" width="13.5" height="24.75" rx="3" stroke="#25314C" strokeWidth="1.5"/>
                      <path d="M1 4.62915L22 23.6292" stroke="#25314C" strokeWidth="2" strokeLinecap="round"/>
                      <defs>
                        <clipPath id="clip0_1_84350">
                          <rect x="3.66455" width="15" height="26.25" rx="3.75" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">Lost and found PB</h3>
                    <p className="text-sm text-gray-400">Report here a found power bank</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={onOpenHelpCenter}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">Report issue</h3>
                    <p className="text-sm text-gray-400">Let us know if you encountered any issues</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
