import { MapPin, Clock, CreditCard, Battery, Zap, Heart, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { isBusinessOpen } from '../utils/mapMarkers';
import QrScanner from './QrScanner';
import SubscriptionRentalWarningModal from './SubscriptionRentalWarningModal';
import ChoosePaymentMethod from './ChoosePaymentMethod';
import { profileAPI, profileEdgeAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';
import { supabase } from '../lib/supabase';

interface Deal {
  id: string;
  title: string;
  description: string;
  discount?: number | string;
  saveValue?: number;
}

interface LocationData {
  id: string;
  name: string;
  address: string;
  specialty?: string[];
  image?: string;
  coverImageIds?: string[];
  logoId?: string;
  rating?: number;
  reviewCount?: number;
  open_days?: string;
  open_time?: string;
  deals?: Deal[];
  availableSlots?: number;
  returnSlots?: number;
  hasCharging?: boolean;
  hasDining?: boolean;
  serviceType?: string;
  occupiedSlots?: number;
  totalSlots?: number;
  hasStation?: boolean;
  subcategoryName?: string;
  businessType?: string;
  unitPrice?: string;
  unitMin?: string;
}

interface MapLocationModalProps {
  location: LocationData;
  isLiked: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onBookDining?: () => void;
  isLoadingLike?: boolean;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

function formatOpeningHours(openDays: string | null | undefined, openTime: string | null | undefined): string {
  if (!openDays && !openTime) return 'Hours Available';

  let timeDisplay = openTime || '';
  const timeMatch = timeDisplay.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (timeMatch) {
    timeDisplay = `${timeMatch[1]} – ${timeMatch[2]}`;
  }

  if (!openDays) return timeDisplay || 'Hours Available';

  const daysArray = openDays.toLowerCase().split(',').map(d => d.trim()).filter(d => d.length > 2);
  if (daysArray.length === 0) return timeDisplay || 'Hours Available';

  const abbreviateDay = (shortDay: string) => {
    const dayMap: { [key: string]: string } = {
      'sun': 'Sun', 'sunday': 'Sun',
      'mon': 'Mon', 'monday': 'Mon',
      'tue': 'Tue', 'tuesday': 'Tue',
      'wed': 'Wed', 'wednesday': 'Wed',
      'thu': 'Thu', 'thursday': 'Thu',
      'fri': 'Fri', 'friday': 'Fri',
      'sat': 'Sat', 'saturday': 'Sat'
    };
    return dayMap[shortDay.toLowerCase()] || shortDay.charAt(0).toUpperCase() + shortDay.slice(1).substring(0, 2);
  };

  const firstDay = abbreviateDay(daysArray[0]);
  const lastDay = abbreviateDay(daysArray[daysArray.length - 1]);

  if (daysArray.length === 7) {
    return `${firstDay} – ${lastDay} | ${timeDisplay}`;
  }

  if (daysArray.length > 1) {
    return `${firstDay} – ${lastDay} | ${timeDisplay}`;
  }

  return `${firstDay} | ${timeDisplay}`;
}

export function MapDiningOnlyModal({ location, isLiked, onClose, onToggleLike, onBookDining, isLoadingLike, userProfile }: MapLocationModalProps) {
  const imageUrl = getOptimizedImageUrl(
    location.coverImageIds?.[0] || location.logoId || location.image,
    'merchant',
    { width: 800, height: 600 }
  );

  const isOpen = isBusinessOpen(location.open_time, location.open_days);
  const hasDeals = location.deals && location.deals.length > 0;

  return (
    <>
      <div className="absolute inset-0 bg-black/20 z-30" onClick={onClose}></div>
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-40 animate-slideUp">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto">
          <div className="relative h-52 bg-gradient-to-br from-orange-400 to-pink-400">
            <img
              src={imageUrl}
              alt={location.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('unsplash.com')) {
                  img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';
                }
              }}
            />
            <button
              onClick={onToggleLike}
              disabled={isLoadingLike}
              className={`absolute top-3 right-3 p-2.5 rounded-full transition-all duration-200 ${
                isLiked
                  ? 'bg-white/90 hover:bg-white'
                  : 'bg-white/90 hover:bg-white'
              } disabled:opacity-50 shadow-md`}
            >
              <Heart className={`w-5 h-5 transition-all duration-200 ${
                isLiked
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600'
              }`} />
            </button>
          </div>

          <div className="px-5 pt-4 pb-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">{location.name}</h3>
              {location.rating > 0 && (
                <div className="flex items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-orange-600">{location.rating}</span>
                  <span className="text-orange-400" style={{ fontSize: '10px' }}>⭐</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600 truncate">{location.address}</span>
              <span className="flex items-center gap-2 ml-auto whitespace-nowrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isOpen ? 'Open' : 'Closed'}
                </span>
                <span className="text-sm text-gray-600">{location.open_time?.match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/)?.[0].replace(/\s*[-–]\s*/, ' – ') || '09:00 – 17:00'}</span>
              </span>
            </div>

            <div className="text-sm text-gray-600 mb-4 font-medium">
              {location.subcategoryName || 'Dine | Bites & Drinks'}
            </div>

            {hasDeals && (
              <div className="bg-orange-50 rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-orange-600 mb-1">Special Offer</p>
                <p className="text-sm text-gray-700">{location.deals![0].description}</p>
              </div>
            )}

            <button
              onClick={onBookDining}
              className="w-full bg-[#FFA374] text-white py-3.5 rounded-2xl font-bold hover:bg-[#ff9461] transition-all shadow-md active:scale-[0.98]"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function MapChargingOnlyModal({ location, isLiked, onClose, onToggleLike, isLoadingLike, userProfile }: MapLocationModalProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [isCheckingRental, setIsCheckingRental] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string>('flex');
  const [freeRentalUsed, setFreeRentalUsed] = useState(false);

  const isOpen = isBusinessOpen(location.open_time, location.open_days);
  const occupiedSlots = location.occupiedSlots || 0;
  const totalSlots = location.totalSlots || 0;
  const returnSlots = location.returnSlots || 0;

  useEffect(() => {
    checkMembershipStatus();
  }, []);

  const checkMembershipStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('subscription')
        .eq('id', user.id)
        .single();

      const { data: membershipData } = await supabase
        .from('user_memberships')
        .select('membership_tier, free_rental_used_today, last_free_rental_reset')
        .eq('user_id', user.id)
        .single();

      const tier = membershipData?.membership_tier || userData?.subscription || 'flex';
      setMembershipTier(tier);

      const today = new Date().toISOString().split('T')[0];
      const lastReset = membershipData?.last_free_rental_reset?.split('T')[0];
      const needsReset = lastReset !== today;

      if (needsReset) {
        setFreeRentalUsed(false);
      } else {
        setFreeRentalUsed(membershipData?.free_rental_used_today || false);
      }
    } catch (error) {
      console.error('Failed to check membership status:', error);
      setMembershipTier('flex');
      setFreeRentalUsed(false);
    }
  };

  const handleQrButtonClick = async () => {
    if (isCheckingRental) return;

    const isSubscriptionUser = membershipTier === 'silver' || membershipTier === 'gold';

    if (isSubscriptionUser && freeRentalUsed) {
      setShowWarningModal(true);
    } else {
      setShowScanner(true);
    }
  };

  const handleWarningConfirm = () => {
    setShowWarningModal(false);
    setShowPaymentSelection(true);
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
  };

  const handlePaymentMethodSelected = (paymentMethodId: string) => {
    setShowPaymentSelection(false);
    setShowScanner(true);
  };

  const handleClosePaymentSelection = () => {
    setShowPaymentSelection(false);
  };

  const handleCloseScanner = () => {
    console.log('🔙 QR Scanner close button clicked - returning to MapView');
    setShowScanner(false);
    onClose();
  };

  if (showPaymentSelection) {
    return (
      <ChoosePaymentMethod
        onClose={handleClosePaymentSelection}
        onPaymentMethodSelected={handlePaymentMethodSelected}
        title="Select Payment Method"
        description="Choose or add a payment method for this rental"
        userProfile={userProfile}
      />
    );
  }

  if (showScanner) {
    return <QrScanner onClose={handleCloseScanner} />;
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/20 z-30" onClick={onClose}></div>
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-40 animate-slideUp">
        <div className="max-w-md mx-auto relative">
          <button
            onClick={handleQrButtonClick}
            disabled={isCheckingRental}
            className="absolute -top-[30px] right-[26.5px] w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg flex items-center justify-center z-30 hover:shadow-xl transition-shadow active:scale-95 disabled:opacity-50"
          >
            <QrCode className="w-7 h-7 text-white" />
          </button>

          {showWarningModal && (
            <SubscriptionRentalWarningModal
              onConfirm={handleWarningConfirm}
              onCancel={handleWarningCancel}
            />
          )}

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative" style={{
            background: 'radial-gradient(circle at top 3.6px right 59.1px, transparent 38.1px, white 38.6px)',
            backgroundRepeat: 'no-repeat'
          }}>
            <div
              className="absolute top-0 left-0 right-0 py-3 flex justify-center cursor-pointer active:cursor-grabbing z-10"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

          <div className="absolute top-3 left-4 z-20">
            <button
              onClick={onToggleLike}
              disabled={isLoadingLike}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                isLiked
                  ? 'bg-red-50 hover:bg-red-100'
                  : 'bg-gray-100 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              <Heart className={`w-5 h-5 transition-all duration-200 ${
                isLiked
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600'
              }`} />
            </button>
          </div>

        <div className="pt-12 px-5 pb-5">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{location.name}</h3>

          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{location.address}</span>
            <span className="flex items-center gap-2 ml-auto whitespace-nowrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
              <span className="text-sm text-gray-600">{location.open_time?.match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/)?.[0].replace(/\s*[-–]\s*/, ' – ') || '09:00 – 17:00'}</span>
            </span>
          </div>

          <div className="text-sm text-gray-600 mb-4 font-medium">
            {location.subcategoryName || 'Charging Hub'}
          </div>

          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex-1 bg-cyan-50 border border-cyan-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2.5 font-semibold text-cyan-800">
                <CreditCard className="w-5 h-5" />
                <span className="text-sm">
                  € {location.unitPrice || 'Free'} / {location.unitMin || '60'} Min
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-700">
                <Battery className="w-5 h-5 text-orange-400" />
                <span className="text-sm">{occupiedSlots} PB Available</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-slate-400">
                  <path d="M19.5 4.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5zM9 16.5H6V7.5h3v9zm3.75 0h-3v-9h3v9zm3.75 0h-3v-9h3v9z"></path>
                </svg>
                <span className="text-sm">{returnSlots} Return slots</span>
              </div>
            </div>

            <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden p-3">
              <img
                src="https://dopjawhuylqipltnuydp.supabase.co/storage/v1/object/public/merchant-images/Category_Icons/Charging%20station.png"
                alt="Charging Station"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <button
            onClick={() => {
              const address = encodeURIComponent(location.address);
              window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
            }}
            className="w-full bg-gradient-to-br from-orange-400 to-orange-500 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-shadow shadow-lg flex items-center justify-center gap-2.5 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="w-6 h-6">
              <g fill="none" fillRule="evenodd">
                <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/>
                <path fill="currentColor" d="M18 16a3 3 0 1 1 0 6a3 3 0 0 1 0-6M15.5 4a4.5 4.5 0 1 1 0 9h-7a2.5 2.5 0 0 0 0 5H13a1 1 0 1 1 0 2H8.5a4.5 4.5 0 1 1 0-9h7a2.5 2.5 0 0 0 0-5H11a1 1 0 1 1 0-2zM18 18a1 1 0 1 0 0 2a1 1 0 0 0 0-2M6 2a3 3 0 1 1 0 6a3 3 0 0 1 0-6m0 2a1 1 0 1 0 0 2a1 1 0 0 0 0-2"/>
              </g>
            </svg>
            <span>Go There</span>
          </button>
        </div>
        </div>
      </div>
      </div>
    </>
  );
}

export function MapDiningAndChargingModal({ location, isLiked, onClose, onToggleLike, onBookDining, isLoadingLike, userProfile }: MapLocationModalProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [isCheckingRental, setIsCheckingRental] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string>('flex');
  const [freeRentalUsed, setFreeRentalUsed] = useState(false);

  const imageUrl = getOptimizedImageUrl(
    location.coverImageIds?.[0] || location.logoId || location.image,
    'merchant',
    { width: 800, height: 600 }
  );

  const isOpen = isBusinessOpen(location.open_time, location.open_days);
  const hasDeals = location.deals && location.deals.length > 0;
  const occupiedSlots = location.occupiedSlots || 0;
  const totalSlots = location.totalSlots || 0;
  const returnSlots = location.returnSlots || 0;

  useEffect(() => {
    checkMembershipStatus();
  }, []);

  const checkMembershipStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('subscription')
        .eq('id', user.id)
        .single();

      const { data: membershipData } = await supabase
        .from('user_memberships')
        .select('membership_tier, free_rental_used_today, last_free_rental_reset')
        .eq('user_id', user.id)
        .single();

      const tier = membershipData?.membership_tier || userData?.subscription || 'flex';
      setMembershipTier(tier);

      const today = new Date().toISOString().split('T')[0];
      const lastReset = membershipData?.last_free_rental_reset?.split('T')[0];
      const needsReset = lastReset !== today;

      if (needsReset) {
        setFreeRentalUsed(false);
      } else {
        setFreeRentalUsed(membershipData?.free_rental_used_today || false);
      }
    } catch (error) {
      console.error('Failed to check membership status:', error);
      setMembershipTier('flex');
      setFreeRentalUsed(false);
    }
  };

  const handleQrButtonClick = async () => {
    if (isCheckingRental) return;

    const isSubscriptionUser = membershipTier === 'silver' || membershipTier === 'gold';

    if (isSubscriptionUser && freeRentalUsed) {
      setShowWarningModal(true);
    } else {
      setShowScanner(true);
    }
  };

  const handleWarningConfirm = () => {
    setShowWarningModal(false);
    setShowPaymentSelection(true);
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
  };

  const handlePaymentMethodSelected = (paymentMethodId: string) => {
    setShowPaymentSelection(false);
    setShowScanner(true);
  };

  const handleClosePaymentSelection = () => {
    setShowPaymentSelection(false);
  };

  const handleCloseScanner = () => {
    console.log('🔙 QR Scanner close button clicked - returning to MapView');
    setShowScanner(false);
    onClose();
  };

  if (showPaymentSelection) {
    return (
      <ChoosePaymentMethod
        onClose={handleClosePaymentSelection}
        onPaymentMethodSelected={handlePaymentMethodSelected}
        title="Select Payment Method"
        description="Choose or add a payment method for this rental"
        userProfile={userProfile}
      />
    );
  }

  if (showScanner) {
    return <QrScanner onClose={handleCloseScanner} />;
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/20 z-30" onClick={onClose}></div>
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-40 animate-slideUp">
        <div className="max-w-md mx-auto relative">
          <button
            onClick={handleQrButtonClick}
            disabled={isCheckingRental}
            className="absolute -top-[23px] right-6 w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg flex items-center justify-center z-30 hover:shadow-xl transition-shadow active:scale-95 disabled:opacity-50"
          >
            <QrCode className="w-7 h-7 text-white" />
          </button>

          {showWarningModal && (
            <SubscriptionRentalWarningModal
              onConfirm={handleWarningConfirm}
              onCancel={handleWarningCancel}
            />
          )}

          <div className="bg-white rounded-3xl shadow-2xl relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 py-3 flex justify-center cursor-pointer active:cursor-grabbing z-10"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            <div className="relative h-52 overflow-hidden" style={{
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
            }}>
              <img
                src={imageUrl}
                alt={location.name}
                className="w-full h-full object-cover"
                style={{
                  maskImage: 'radial-gradient(circle 28px at calc(100% - 52px) 5px, transparent 28px, black 28.5px)',
                  WebkitMaskImage: 'radial-gradient(circle 28px at calc(100% - 52px) 5px, transparent 28px, black 28.5px)',
                }}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.includes('unsplash.com')) {
                    img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';
                  }
                }}
              />
              <button
                onClick={onToggleLike}
                disabled={isLoadingLike}
                className={`absolute top-12 left-4 p-2.5 rounded-full transition-all duration-200 ${
                  isLiked
                    ? 'bg-red-50 hover:bg-red-100'
                    : 'bg-gray-100 hover:bg-gray-200'
                } disabled:opacity-50 z-20`}
              >
                <Heart className={`w-5 h-5 transition-all duration-200 ${
                  isLiked
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-600'
                }`} />
              </button>
            </div>

            <div className="px-5 pt-4 pb-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">{location.name}</h3>
                {location.rating > 0 && (
                  <div className="flex items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-bold text-orange-600">{location.rating}</span>
                    <span className="text-orange-400" style={{ fontSize: '10px' }}>⭐</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 truncate">{location.address}</span>
                <span className="flex items-center gap-2 ml-auto whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                  <span className="text-sm text-gray-600">{location.open_time?.match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/)?.[0].replace(/\s*[-–]\s*/, ' – ') || '09:00 – 17:00'}</span>
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-4 font-medium">
                {location.subcategoryName || 'Bites | Drinks & Charging'}
              </div>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex-1 bg-[#E4F5FE] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-cyan-700" />
                    <span className="text-sm text-gray-800 font-medium">
                      € {location.unitPrice || 'Free'} / {location.unitMin || '60'} Min
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Battery className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-800 font-medium">{occupiedSlots} PB Available</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-slate-500">
                      <path d="M19.5 4.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5zM9 16.5H6V7.5h3v9zm3.75 0h-3v-9h3v9zm3.75 0h-3v-9h3v9z"></path>
                    </svg>
                    <span className="text-sm text-gray-800 font-medium">{returnSlots} Return slots</span>
                  </div>
                </div>

                <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden p-3">
                  <img
                    src={hasDeals && location.deals && location.deals.length > 0 && location.deals[0].image
                      ? location.deals[0].image
                      : "https://dopjawhuylqipltnuydp.supabase.co/storage/v1/object/public/merchant-images/Category_Icons/Charging%20station.png"}
                    alt={hasDeals && location.deals && location.deals.length > 0 ? location.deals[0].title : "Charging Station"}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {hasDeals && location.deals && location.deals.length > 0 && (
                <div className="bg-orange-50 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-bold text-orange-600 mb-1">Special Offer</p>
                  <p className="text-sm text-gray-700">
                    {location.deals[0].description}
                  </p>
                </div>
              )}

              <button
                onClick={onBookDining}
                className="w-full bg-[#FFA374] text-white py-3.5 rounded-2xl font-bold hover:bg-[#ff9461] transition-all shadow-md active:scale-[0.98]"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
