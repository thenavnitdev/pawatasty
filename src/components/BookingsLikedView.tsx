import { Heart, ChevronLeft, MapPin, Star, Clock } from 'lucide-react';
import { likedMerchantsEdgeAPI } from '../services/mobile';
import { getMerchantCoverUrl } from '../utils/imageUtils';
import { calculateDistance } from '../utils/geolocation';
import { useUserLocation } from '../utils/LocationContext';

interface LikedMerchant {
  id: string;
  merchantId: string;
  companyName: string;
  companyDescription: string;
  businessCategory: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNr: string;
  website: string;
  openDays: string;
  openTime: string;
  logoId: string | null;
  coverImageIds: string[];
  rating: number;
  likedAt?: string;
}

interface BookingsLikedViewProps {
  onBack: () => void;
  onOpenHistory: () => void;
  onMerchantClick?: (merchant: LikedMerchant) => void;
  likedMerchants: LikedMerchant[];
  setLikedMerchants: (merchants: LikedMerchant[] | ((prev: LikedMerchant[]) => LikedMerchant[])) => void;
  isLoading: boolean;
}

export default function BookingsLikedView({
  onBack,
  onOpenHistory,
  onMerchantClick,
  likedMerchants,
  setLikedMerchants,
  isLoading
}: BookingsLikedViewProps) {
  const { userLocation } = useUserLocation();

  const formatDistance = (merchant: LikedMerchant): string | null => {
    if (!userLocation || !merchant.latitude || !merchant.longitude) {
      return null;
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      merchant.latitude,
      merchant.longitude
    );

    return `${Math.round(distance)}km`;
  };

  const formatOpeningHours = (openDays?: string, openTime?: string): string => {
    if (!openDays || !openTime) return '';

    // Parse time to extract hours (handle formats like "11:00-17:00" or "s 11:00-17:00")
    let timeDisplay = openTime;
    const timeMatch = timeDisplay.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      timeDisplay = `${timeMatch[1]} – ${timeMatch[2]}`;
    }

    // Parse days: "sunday,monday,tuesday,wednesday,thursday,friday,saturday"
    const daysArray = openDays.toLowerCase().split(',').map(d => d.trim()).filter(d => d.length > 2);

    if (daysArray.length === 0) return timeDisplay || '';

    const dayMap: { [key: string]: string } = {
      'sun': 'Sun', 'sunday': 'Sun',
      'mon': 'Mon', 'monday': 'Mon',
      'tue': 'Tue', 'tuesday': 'Tue',
      'wed': 'Wed', 'wednesday': 'Wed',
      'thu': 'Thu', 'thursday': 'Thu',
      'fri': 'Fri', 'friday': 'Fri',
      'sat': 'Sat', 'saturday': 'Sat'
    };

    const abbreviatedDays = daysArray.map(d => dayMap[d]).filter(Boolean);

    if (abbreviatedDays.length === 0) return timeDisplay || '';
    if (abbreviatedDays.length === 1) return `${abbreviatedDays[0]}, ${timeDisplay}`;

    // Show first and last day abbreviated
    const firstDay = abbreviatedDays[0];
    const lastDay = abbreviatedDays[abbreviatedDays.length - 1];

    return `${firstDay} – ${lastDay}, ${timeDisplay}`;
  };

  const handleUnlike = async (merchantId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      console.log('💔 Unliking merchant from liked list:', merchantId);
      await likedMerchantsEdgeAPI.unlikeMerchant(merchantId);
      setLikedMerchants(prev => prev.filter(m => m.id !== merchantId));
      console.log('✅ Unliked successfully from liked list');
    } catch (error) {
      console.error('❌ Failed to unlike merchant:', error);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="px-4 pt-6 pb-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1"></div>
          <button onClick={onOpenHistory} className="font-medium" style={{ color: '#203F55' }}>History</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : likedMerchants.length === 0 ? (
          <div className="flex items-center justify-center h-64 px-6">
            <div className="text-center">
              <Heart className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-base font-medium mb-1">No liked places yet</p>
              <p className="text-gray-500 text-sm">Start exploring and save your favorites</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            {likedMerchants.map((merchant) => {
              const coverImageId = merchant.coverImageIds?.[0] || merchant.logoId;
              const imageUrl = getMerchantCoverUrl(coverImageId);

              return (
                <div
                  key={merchant.id}
                  onClick={() => onMerchantClick?.(merchant)}
                  className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer p-3 flex gap-3"
                >
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={merchant.companyName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <button
                      onClick={(e) => handleUnlike(merchant.id, e)}
                      className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all z-10"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-1">
                      {merchant.companyName}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs mb-1.5">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                        <span className="font-semibold text-slate-900">{merchant.rating.toFixed(1)}</span>
                      </div>
                      {formatDistance(merchant) && (
                        <>
                          <span className="text-gray-400">|</span>
                          <span className="font-semibold text-slate-900">{formatDistance(merchant)}</span>
                        </>
                      )}
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-700 capitalize truncate">{merchant.businessCategory}</span>
                    </div>

                    <div className="flex items-start gap-1 text-xs text-gray-600 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" />
                      <span className="line-clamp-1">{merchant.address}</span>
                    </div>

                    {merchant.openDays && merchant.openTime && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatOpeningHours(merchant.openDays, merchant.openTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
