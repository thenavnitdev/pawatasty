import { useState, useEffect } from 'react';
import { Booking } from '../types';
import { List, Calendar, Users, Heart, ChevronLeft } from 'lucide-react';
import BookingsWeekView from './BookingsWeekView';
import BookingsDetailView from './BookingsDetailView';
import BookingsInvitesView from './BookingsInvitesView';
import BookingsLikedView from './BookingsLikedView';
import BookingsLikedHistoryView from './BookingsLikedHistoryView';
import { merchantsEdgeAPI, merchantsAPI, likedMerchantsEdgeAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';
import { getMerchantCoverUrl } from '../utils/imageUtils';
import { extractCityFromAddress } from '../utils/addressUtils';
import { isBusinessOpen } from '../utils/mapMarkers';

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

interface BookingsContainerProps {
  bookings: Booking[];
  onBack: () => void;
  onBookingClick: (bookingId: string) => void;
  onOpenChat: () => void;
  onOpenHistory: () => void;
  onRestaurantSelect?: (restaurant: any) => void;
  initialView?: BookingView;
  onNavigateToDiscover?: () => void;
  onNavigateToMap?: () => void;
  onInviteCountChange?: (count: number) => void;
}

type BookingView = 'list' | 'week' | 'invites' | 'liked' | 'liked-history';

export default function BookingsContainer({
  bookings,
  onBack,
  onBookingClick,
  onOpenChat,
  onOpenHistory,
  onRestaurantSelect,
  initialView = 'week',
  onNavigateToDiscover,
  onNavigateToMap,
  onInviteCountChange
}: BookingsContainerProps) {
  const [currentView, setCurrentView] = useState<BookingView>(initialView);
  const [inviteCount, setInviteCount] = useState(0);
  const [likedMerchants, setLikedMerchants] = useState<LikedMerchant[]>([]);
  const [likedMerchantsLoaded, setLikedMerchantsLoaded] = useState(false);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);

  useEffect(() => {
    if (currentView === 'liked' && !likedMerchantsLoaded) {
      loadLikedMerchants();
    }
  }, [currentView, likedMerchantsLoaded]);

  const loadLikedMerchants = async () => {
    try {
      setIsLoadingLiked(true);
      console.log('📋 Loading liked merchants...');
      if (isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) {
        const merchants = await likedMerchantsEdgeAPI.getLikedMerchants() as unknown as LikedMerchant[];
        console.log('📋 Loaded liked merchants:', merchants.length, merchants);
        setLikedMerchants(merchants);
        setLikedMerchantsLoaded(true);
      }
    } catch (error) {
      console.error('❌ Failed to load liked merchants:', error);
    } finally {
      setIsLoadingLiked(false);
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'bookings') {
      onBack();
    } else {
      setCurrentView(view as BookingView);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50">
      <div className="h-full">
        {currentView === 'week' && (
          <BookingsWeekView
            bookings={bookings}
            onBack={onBack}
            onBookingClick={onBookingClick}
            onOpenHistory={onOpenHistory}
          />
        )}
        {currentView === 'list' && (
          <BookingsDetailView
            bookings={bookings}
            onBack={onBack}
            onOpenChat={onOpenChat}
            onOpenHistory={onOpenHistory}
            onBookingClick={onBookingClick}
          />
        )}
        {currentView === 'invites' && (
          <BookingsInvitesView
            onBack={onBack}
            onOpenHistory={onOpenHistory}
            onInviteCountChange={onInviteCountChange}
          />
        )}
        {currentView === 'liked' && (
          <BookingsLikedView
            onBack={onBack}
            onOpenHistory={onOpenHistory}
            likedMerchants={likedMerchants}
            setLikedMerchants={setLikedMerchants}
            isLoading={isLoadingLiked}
            onMerchantClick={async (merchant) => {
              if (onRestaurantSelect) {
                try {
                  console.log('🔍 Fetching full merchant data for liked merchant:', merchant.id);

                  // Fetch complete merchant data with deals, reviews, etc.
                  const fullMerchant = isFeatureEnabled('USE_EDGE_MERCHANTS')
                    ? await merchantsEdgeAPI.getMerchantById(merchant.id)
                    : await merchantsAPI.getMerchantById(merchant.id);

                  console.log('✅ Full merchant data loaded:', fullMerchant);

                  // Extract city from address using proper parsing logic
                  const city = extractCityFromAddress(fullMerchant.address || '', fullMerchant.city);

                  // Use company specialty from database only (no fallback)
                  const specialty = fullMerchant.specialty && fullMerchant.specialty.length > 0
                    ? fullMerchant.specialty
                    : [];

                  // Generate main image URL
                  const imageUrl = fullMerchant.coverImageIds?.[0]
                    ? getMerchantCoverUrl(fullMerchant.coverImageIds[0])
                    : fullMerchant.logoId
                    ? getMerchantCoverUrl(fullMerchant.logoId)
                    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';

                  // Calculate status based on opening hours
                  const isOpen = isBusinessOpen(fullMerchant.openTime, fullMerchant.openDays);

                  const restaurant = {
                    id: fullMerchant.id,
                    name: fullMerchant.name,
                    specialty: specialty,
                    city: city,
                    status: isOpen ? 'Open' : 'Closed',
                    image: imageUrl,
                    address: fullMerchant.address,
                    rating: fullMerchant.rating || 0,
                    reviewCount: fullMerchant.reviewCount || 0,
                    deals: fullMerchant.deals || [],
                    latitude: fullMerchant.latitude,
                    longitude: fullMerchant.longitude,
                    coverImageIds: fullMerchant.coverImageIds,
                    logoId: fullMerchant.logoId,
                    open_days: fullMerchant.openDays,
                    open_time: fullMerchant.openTime,
                    businessType: fullMerchant.businessType,
                    subcategoryName: fullMerchant.subcategoryName,
                    availableSlots: fullMerchant.availableSlots,
                    occupiedSlots: fullMerchant.occupiedSlots,
                    totalSlots: fullMerchant.totalSlots,
                    returnSlots: fullMerchant.returnSlots,
                    unitPrice: fullMerchant.unitPrice,
                    unitMin: fullMerchant.unitMin,
                    parentMerchantId: fullMerchant.parentMerchantId,
                  };

                  console.log('🎯 Passing restaurant to parent:', restaurant);
                  onRestaurantSelect(restaurant);
                } catch (error) {
                  console.error('❌ Failed to load full merchant data:', error);

                  // Fallback to basic merchant data if fetch fails
                  const city = extractCityFromAddress(merchant.address || '', (merchant as any).city);
                  const specialty = merchant.businessCategory ? [merchant.businessCategory] : ['Restaurant'];
                  const imageUrl = merchant.coverImageIds?.[0]
                    ? getMerchantCoverUrl(merchant.coverImageIds[0])
                    : merchant.logoId
                    ? getMerchantCoverUrl(merchant.logoId)
                    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';

                  // Calculate status based on opening hours
                  const isOpenFallback = isBusinessOpen(merchant.openTime, merchant.openDays);

                  const restaurant = {
                    id: merchant.id,
                    name: merchant.companyName,
                    specialty: specialty,
                    city: city,
                    status: isOpenFallback ? 'Open' : 'Closed',
                    image: imageUrl,
                    address: merchant.address,
                    rating: merchant.rating || 0,
                    reviewCount: 0,
                    deals: [],
                    latitude: merchant.latitude,
                    longitude: merchant.longitude,
                    coverImageIds: merchant.coverImageIds,
                    logoId: merchant.logoId,
                    open_days: merchant.openDays,
                    open_time: merchant.openTime,
                    subcategoryName: (merchant as any).subcategoryName,
                  };

                  onRestaurantSelect(restaurant);
                }
              }
            }}
          />
        )}
        {currentView === 'liked-history' && (
          <BookingsLikedHistoryView
            onBack={onBack}
            onMerchantClick={async (merchant) => {
              if (onRestaurantSelect) {
                try {
                  console.log('🔍 Fetching full merchant data for liked merchant (from history):', merchant.id);

                  // Fetch complete merchant data with deals, reviews, etc.
                  const fullMerchant = isFeatureEnabled('USE_EDGE_MERCHANTS')
                    ? await merchantsEdgeAPI.getMerchantById(merchant.id)
                    : await merchantsAPI.getMerchantById(merchant.id);

                  console.log('✅ Full merchant data loaded:', fullMerchant);

                  // Extract city from address using proper parsing logic
                  const city = extractCityFromAddress(fullMerchant.address || '', fullMerchant.city);

                  // Use company specialty from database only (no fallback)
                  const specialty = fullMerchant.specialty && fullMerchant.specialty.length > 0
                    ? fullMerchant.specialty
                    : [];

                  // Generate main image URL
                  const imageUrl = fullMerchant.coverImageIds?.[0]
                    ? getMerchantCoverUrl(fullMerchant.coverImageIds[0])
                    : fullMerchant.logoId
                    ? getMerchantCoverUrl(fullMerchant.logoId)
                    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';

                  // Calculate status based on opening hours
                  const isOpen = isBusinessOpen(fullMerchant.openTime, fullMerchant.openDays);

                  const restaurant = {
                    id: fullMerchant.id,
                    name: fullMerchant.name,
                    specialty: specialty,
                    city: city,
                    status: isOpen ? 'Open' : 'Closed',
                    image: imageUrl,
                    address: fullMerchant.address,
                    rating: fullMerchant.rating || 0,
                    reviewCount: fullMerchant.reviewCount || 0,
                    deals: fullMerchant.deals || [],
                    latitude: fullMerchant.latitude,
                    longitude: fullMerchant.longitude,
                    coverImageIds: fullMerchant.coverImageIds,
                    logoId: fullMerchant.logoId,
                    open_days: fullMerchant.openDays,
                    open_time: fullMerchant.openTime,
                    businessType: fullMerchant.businessType,
                    subcategoryName: fullMerchant.subcategoryName,
                    availableSlots: fullMerchant.availableSlots,
                    occupiedSlots: fullMerchant.occupiedSlots,
                    totalSlots: fullMerchant.totalSlots,
                    returnSlots: fullMerchant.returnSlots,
                    unitPrice: fullMerchant.unitPrice,
                    unitMin: fullMerchant.unitMin,
                    parentMerchantId: fullMerchant.parentMerchantId,
                  };

                  console.log('🎯 Passing restaurant to parent:', restaurant);
                  onRestaurantSelect(restaurant);
                } catch (error) {
                  console.error('❌ Failed to load full merchant data:', error);

                  // Fallback to basic merchant data if fetch fails
                  const city = extractCityFromAddress(merchant.address || '', (merchant as any).city);
                  const specialty = merchant.businessCategory ? [merchant.businessCategory] : ['Restaurant'];
                  const imageUrl = merchant.coverImageIds?.[0]
                    ? getMerchantCoverUrl(merchant.coverImageIds[0])
                    : merchant.logoId
                    ? getMerchantCoverUrl(merchant.logoId)
                    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';

                  // Calculate status based on opening hours
                  const isOpenFallback = isBusinessOpen(merchant.openTime, merchant.openDays);

                  const restaurant = {
                    id: merchant.id,
                    name: merchant.companyName,
                    specialty: specialty,
                    city: city,
                    status: isOpenFallback ? 'Open' : 'Closed',
                    image: imageUrl,
                    address: merchant.address,
                    rating: merchant.rating || 0,
                    reviewCount: 0,
                    deals: [],
                    latitude: merchant.latitude,
                    longitude: merchant.longitude,
                    coverImageIds: merchant.coverImageIds,
                    logoId: merchant.logoId,
                    open_days: merchant.openDays,
                    open_time: merchant.openTime,
                    subcategoryName: (merchant as any).subcategoryName,
                  };

                  onRestaurantSelect(restaurant);
                }
              }
            }}
          />
        )}
      </div>

      {/* Internal tabs for switching between bookings views */}
      <div className="fixed bottom-5 left-6 right-6 z-20">
        <div className="bg-white rounded-full shadow-2xl px-6 py-3 flex justify-around items-center max-w-md mx-auto">
          <button
            onClick={() => setCurrentView('list')}
            className={`p-3 hover:bg-gray-100 rounded-full transition-colors ${
              currentView === 'list' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <Calendar className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`p-3 hover:bg-gray-100 rounded-full transition-colors ${
              currentView === 'week' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <List className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentView('invites')}
            className={`p-3 hover:bg-gray-100 rounded-full transition-colors relative ${
              currentView === 'invites' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <Users className="w-6 h-6" />
            {inviteCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {inviteCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('liked')}
            className={`p-3 hover:bg-gray-100 rounded-full transition-colors ${
              currentView === 'liked' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <Heart className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
