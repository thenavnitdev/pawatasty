import { Heart, ChevronLeft, MapPin, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { likedMerchantsEdgeAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';
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

interface BookingsLikedHistoryViewProps {
  onBack: () => void;
  onMerchantClick?: (merchant: LikedMerchant) => void;
}

export default function BookingsLikedHistoryView({ onBack, onMerchantClick }: BookingsLikedHistoryViewProps) {
  const { userLocation } = useUserLocation();
  const [likedMerchants, setLikedMerchants] = useState<LikedMerchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLikedMerchants();
  }, []);

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

  const loadLikedMerchants = async () => {
    try {
      setIsLoading(true);
      console.log('📋 Loading liked merchants history...');
      if (isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) {
        const merchants = await likedMerchantsEdgeAPI.getLikedMerchants() as unknown as LikedMerchant[];
        console.log('📋 Loaded liked merchants history:', merchants.length, merchants);
        setLikedMerchants(merchants);
      }
    } catch (error) {
      console.error('❌ Failed to load liked merchants history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlike = async (merchantId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      console.log('💔 Unliking merchant from history:', merchantId);
      await likedMerchantsEdgeAPI.unlikeMerchant(merchantId);
      setLikedMerchants(prev => prev.filter(m => m.id !== merchantId));
      console.log('✅ Unliked successfully from history');
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
          <h1 className="text-xl font-bold text-slate-900 flex-1 text-center">Liked</h1>
          <button className="font-medium text-sm" style={{ color: '#203F55' }}>
            History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : likedMerchants.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No liked places yet</p>
              <p className="text-gray-500 text-sm mt-2">Start exploring and save your favorites</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {likedMerchants.map((merchant) => {
              return (
                <div
                  key={merchant.id}
                  onClick={() => onMerchantClick?.(merchant)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="p-4 flex gap-3">
                    <div className="relative w-24 h-24 bg-gray-200 rounded-2xl flex-shrink-0">
                      <button
                        onClick={(e) => handleUnlike(merchant.id, e)}
                        className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 mb-1.5">
                        {merchant.companyName}
                      </h3>

                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                          <span className="text-xs font-medium text-slate-900">{merchant.rating.toFixed(1)}</span>
                        </div>
                        {formatDistance(merchant) && (
                          <>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs font-medium text-slate-900">{formatDistance(merchant)}</span>
                          </>
                        )}
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-600 capitalize truncate">{merchant.businessCategory}</span>
                      </div>

                      <div className="flex items-start gap-1.5 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" />
                        <span className="text-xs text-gray-600 line-clamp-1">{merchant.address}</span>
                      </div>

                      {merchant.openDays && merchant.openTime && (
                        <div className="text-xs text-gray-500">
                          <span className="lowercase">{merchant.openDays}</span> • {merchant.openTime}
                        </div>
                      )}
                    </div>
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
