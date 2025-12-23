import { ChevronLeft, Heart, Share2, MapPin, Clock, Battery, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { likedMerchantsAPI, likedMerchantsEdgeAPI, merchantsAPI, merchantsEdgeAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';

interface ChargingStationModalProps {
  station: {
    id: string;
    name: string;
    address: string;
    city: string;
    image: string;
    subcategoryName?: string;
    specialty?: string[];
    latitude?: number;
    longitude?: number;
    openDays?: string;
    openTime?: string;
    availableSlots?: number;
    occupiedSlots?: number;
    totalSlots?: number;
    returnSlots?: number;
    unitPrice?: string;
    unitMin?: string;
  };
  onBack: () => void;
}

export default function ChargingStationModal({ station, onBack }: ChargingStationModalProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [stationData, setStationData] = useState(station);

  useEffect(() => {
    checkLikedStatus();
    loadStationData();
  }, [station.id]);

  const loadStationData = async () => {
    try {
      console.log('Loading station data for:', station.id);
      const stationInfo = isFeatureEnabled('USE_EDGE_MERCHANTS')
        ? await merchantsEdgeAPI.getMerchantById(station.id)
        : await merchantsAPI.getMerchantById(station.id);
      console.log('Station data received:', stationInfo);

      // CRITICAL: Always use backend data as single source of truth
      // Do NOT fall back to initial prop data - backend is authoritative
      const backendSubcategory = stationInfo.subcategoryName || stationInfo.category_name;
      console.log('🏷️ Station subcategory data comparison:', {
        fromInitialProp: station.subcategoryName,
        fromBackend: backendSubcategory,
        usingValue: backendSubcategory
      });

      setStationData({
        ...station,
        subcategoryName: backendSubcategory,
        city: stationInfo.city,
        specialty: stationInfo.specialty,
        address: stationInfo.address,
        openDays: stationInfo.open_days,
        openTime: stationInfo.open_time,
      });
    } catch (error) {
      console.error('Failed to load station data:', error);
    }
  };

  const checkLikedStatus = async () => {
    try {
      if (isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) {
        const likedMerchants = await likedMerchantsEdgeAPI.getLikedMerchants();
        const liked = likedMerchants.some(m => m.id === station.id || (m as any).merchantId === station.id);
        setIsFavorite(liked);
      } else {
        const liked = await likedMerchantsAPI.isLiked(station.id);
        setIsFavorite(liked);
      }
    } catch (error) {
      console.error('Failed to check liked status:', error);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (isLoadingLiked) return;

    const previousState = isFavorite;
    setIsFavorite(!previousState);
    setIsLoadingLiked(true);

    try {
      if (isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) {
        if (previousState) {
          await likedMerchantsEdgeAPI.unlikeMerchant(station.id);
        } else {
          await likedMerchantsEdgeAPI.likeMerchant(station.id);
        }
      } else {
        if (previousState) {
          await likedMerchantsAPI.removeLikedMerchant(station.id);
        } else {
          await likedMerchantsAPI.addLikedMerchant(station.id);
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setIsFavorite(previousState);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to ${previousState ? 'unlike' : 'like'} station: ${errorMessage}`);
    } finally {
      setIsLoadingLiked(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: station.name,
      text: `Check out ${station.name} charging station`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to share:', error);
      }
    }
  };

  const parseOpeningHours = () => {
    if (!station.openTime) {
      return 'Open • 11:00 - 21:00';
    }

    const timeMatch = station.openTime.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      return `Open • ${timeMatch[1]} - ${timeMatch[2]}`;
    }
    return `Open • ${station.openTime}`;
  };

  const handleGoThere = () => {
    let googleMapsUrl;
    if (station.latitude && station.longitude) {
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`;
    } else {
      const address = encodeURIComponent(station.address || station.name);
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
    }
    window.open(googleMapsUrl, '_blank');
  };

  const occupiedSlots = station.occupiedSlots || 0;
  const returnSlots = station.returnSlots || 0;
  const unitPrice = station.unitPrice || 'Free';
  const unitMin = station.unitMin || '60';
  const totalSlots = station.totalSlots || 0;

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-end">
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl relative" style={{ maxHeight: '85vh' }}>
        <button
          className="absolute -top-[23px] right-6 w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg flex items-center justify-center z-30 hover:shadow-xl transition-shadow active:scale-95"
        >
          <QrCode className="w-7 h-7 text-white" />
        </button>

        <div
          className="relative h-52 overflow-hidden"
          style={{
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
          }}
        >
          <img
            src={station.image}
            alt={station.name}
            className="w-full h-full object-cover rounded-t-3xl"
            style={{
              maskImage: 'radial-gradient(circle 30px at top 5px right 52px, transparent 30px, black 30.5px)',
              WebkitMaskImage: 'radial-gradient(circle 30px at top 5px right 52px, transparent 30px, black 30.5px)',
            }}
            onError={(e) => {
              const img = e.currentTarget;
              img.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop';
            }}
          />

          <button
            onClick={onBack}
            className="absolute top-6 left-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          <div className="absolute top-6 right-6 flex gap-2 z-10">
            <button
              onClick={handleToggleFavorite}
              disabled={isLoadingLiked}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                isFavorite
                  ? 'bg-red-50 hover:bg-red-100'
                  : 'bg-white hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <Heart
                className={`w-5 h-5 transition-all duration-200 ${
                  isFavorite
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-800'
                }`}
              />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>

        <div className="p-6 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 13rem)' }}>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{stationData.name}</h1>

            <div className="flex items-center gap-2 text-sm mb-1">
              {stationData.subcategoryName && (
                <span className="font-bold text-slate-800 truncate" style={{ minWidth: 0 }}>
                  {stationData.subcategoryName}
                </span>
              )}
              <span className="text-gray-600 flex-shrink-0">
                <span className="font-semibold text-slate-800">City: </span>
                {stationData.city}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{stationData.address}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-orange-500 font-medium">{parseOpeningHours()}</span>
            </div>
          </div>

          <div className="mb-5">
            {stationData.specialty && stationData.specialty.length > 0 && (
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                {stationData.specialty.join(', ')}
              </h2>
            )}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Battery className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-sm text-slate-700 font-medium">€ {unitPrice} / {unitMin} Min</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Battery className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-sm text-slate-700 font-medium">{occupiedSlots} PB Available</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Battery className="w-5 h-5 text-gray-500" />
                </div>
                <span className="text-sm text-slate-700 font-medium">{returnSlots} Return slots</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 flex items-center justify-center overflow-hidden">
              <img
                src="https://dopjawhuylqipltnuydp.supabase.co/storage/v1/object/public/merchant-images/Category_Icons/Charging%20station.png"
                alt="Charging Station Interface"
                className="w-full h-auto max-w-[240px] object-contain"
              />
            </div>
          </div>

          <button
            onClick={handleGoThere}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-4 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5" />
            Go There
          </button>
        </div>
      </div>
    </div>
  );
}
