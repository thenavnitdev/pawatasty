import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Star, MapPin, SlidersHorizontal } from 'lucide-react';
import { Restaurant } from '../types';
import MerchantDetails from './MerchantDetails';
import BookingConfirmation from './BookingConfirmation';
import BottomNavigation from './BottomNavigation';
import CitySelectionModal from './CitySelectionModal';
import FilterModal from './FilterModal';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { preloadMerchantImages } from '../utils/imagePreloader';
import { extractCityFromAddress } from '../utils/addressUtils';
import { calculateDistance } from '../utils/geolocation';
import { normalizeCityName } from '../utils/cityNormalization';
import { useUserLocation } from '../utils/LocationContext';
import { getCachedCities } from '../utils/citiesCache';

interface DiscoverViewProps {
  restaurants: Restaurant[];
  onRestaurantSelect: (restaurant: Restaurant) => void;
  onBack: () => void;
  onNavigateToBookings: () => void;
  unreadInvitesCount?: number;
}

export default function DiscoverView({ restaurants, onRestaurantSelect, onBack, onNavigateToBookings, unreadInvitesCount = 0 }: DiscoverViewProps) {
  const { userLocation, isLoading: detectingLocation } = useUserLocation();
  const [location, setLocation] = useState('Amsterdam');
  const [recommendationType, setRecommendationType] = useState<'recommended' | 'popular' | 'deals' | 'new'>('recommended');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [completedBooking, setCompletedBooking] = useState<any>(null);
  const [bookingRestaurant, setBookingRestaurant] = useState<any>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [referenceLocation, setReferenceLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  console.log('🔍 DiscoverView render - restaurants:', restaurants.length);

  // Helper function to format distance
  const formatDistance = (restaurant: Restaurant): string | null => {
    if (!referenceLocation || !restaurant.latitude || !restaurant.longitude) {
      return null;
    }

    const distance = calculateDistance(
      referenceLocation.latitude,
      referenceLocation.longitude,
      restaurant.latitude,
      restaurant.longitude
    );

    // Show one decimal for distances under 10km for better accuracy
    // Show whole numbers for distances 10km and above
    if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    }
    return `${Math.round(distance)}km`;
  };

  // Update location and reference coordinates from GPS when available
  useEffect(() => {
    if (userLocation?.city && userLocation.latitude && userLocation.longitude) {
      setLocation(userLocation.city);
      setReferenceLocation({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      });
      console.log('📍 GPS location updated:', userLocation.city, `(${userLocation.latitude}, ${userLocation.longitude})`);
    }
  }, [userLocation]);

  // Update reference coordinates when city is manually selected
  useEffect(() => {
    const updateReferenceForCity = async () => {
      if (!location) return;

      try {
        const cities = await getCachedCities();
        const selectedCityData = cities.find(
          city => city.name.toLowerCase() === location.toLowerCase()
        );

        if (selectedCityData?.latitude && selectedCityData?.longitude) {
          setReferenceLocation({
            latitude: selectedCityData.latitude,
            longitude: selectedCityData.longitude
          });
          console.log(`🏙️ Reference location set to ${location}:`, selectedCityData.latitude, selectedCityData.longitude);
        } else if (!referenceLocation && userLocation) {
          setReferenceLocation({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
          });
          console.log('📍 Fallback to GPS location for reference');
        }
      } catch (error) {
        console.error('Error fetching city coordinates:', error);
      }
    };

    updateReferenceForCity();
  }, [location]);

  // Log and scroll to top when location or reference location changes
  useEffect(() => {
    console.log('🔄 Location or coordinates changed, updating list:', {
      selectedCity: location,
      referenceCoordinates: referenceLocation ? `${referenceLocation.latitude}, ${referenceLocation.longitude}` : 'none'
    });

    // Scroll to top of the list when location changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location, referenceLocation]);

  const filteredAndSortedRestaurants = useMemo(() => {
    return restaurants
      .filter(restaurant => {
        const isChargingOnly = restaurant.businessType === 'chargingonly' || restaurant.merchantCategory === 'chargingonly';

        console.log(`🔍 Processing merchant: ${restaurant.name}`, {
          city: restaurant.city,
          selectedCity: location,
          businessType: restaurant.businessType,
          merchantCategory: restaurant.merchantCategory,
          isChargingOnly,
          hasDeals: (restaurant.deals?.length || 0) > 0,
          deals: restaurant.deals,
          rating: restaurant.rating
        });

        // Always exclude charging-only merchants from Discover view
        if (isChargingOnly) {
          console.log(`🚫 Excluding charging-only merchant: ${restaurant.name}`);
          return false;
        }

        // Apply filters
        if (selectedFilters.length > 0) {
          if (selectedFilters.includes('open') && restaurant.status !== 'Open') {
            return false;
          }
          if (selectedFilters.includes('charging_hub') && (!restaurant.occupiedSlots || restaurant.occupiedSlots === 0)) {
            return false;
          }
          if (selectedFilters.includes('returned_slots') && (!restaurant.returnSlots || restaurant.returnSlots === 0)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aCountry = a.country || 'NL';
        const bCountry = b.country || 'NL';
        const normalizedACityName = normalizeCityName(a.city || '', aCountry);
        const normalizedBCityName = normalizeCityName(b.city || '', bCountry);
        const normalizedSelectedCity = normalizeCityName(location, aCountry);

        const aIsSelectedCity = normalizedACityName.toLowerCase() === normalizedSelectedCity.toLowerCase();
        const bIsSelectedCity = normalizedBCityName.toLowerCase() === normalizedSelectedCity.toLowerCase();

        // City priority first
        if (aIsSelectedCity && !bIsSelectedCity) return -1;
        if (!aIsSelectedCity && bIsSelectedCity) return 1;

        // Apply recommendation sorting based on type
        if (recommendationType === 'recommended') {
          // For recommended (default), sort by proximity
          if (referenceLocation) {
            const aDistance = (a.latitude && a.longitude)
              ? calculateDistance(referenceLocation.latitude, referenceLocation.longitude, a.latitude, a.longitude)
              : Infinity;
            const bDistance = (b.latitude && b.longitude)
              ? calculateDistance(referenceLocation.latitude, referenceLocation.longitude, b.latitude, b.longitude)
              : Infinity;

            if (aDistance !== bDistance) {
              return aDistance - bDistance;
            }
          }
          // If distances are the same or no coordinates, sort by rating
          return (b.rating || 0) - (a.rating || 0);
        } else if (recommendationType === 'popular') {
          // Sort by review count first, then rating
          if ((b.reviewCount || 0) !== (a.reviewCount || 0)) {
            return (b.reviewCount || 0) - (a.reviewCount || 0);
          }
          return (b.rating || 0) - (a.rating || 0);
        } else if (recommendationType === 'deals') {
          // Sort by number of deals and deal value
          const aDealsCount = a.deals?.length || 0;
          const bDealsCount = b.deals?.length || 0;
          if (aDealsCount !== bDealsCount) {
            return bDealsCount - aDealsCount;
          }
          // If same number of deals, sort by deal value
          const aMaxSavings = Math.max(...(a.deals?.map(d => d.saveValue || d.savings || 0) || [0]));
          const bMaxSavings = Math.max(...(b.deals?.map(d => d.saveValue || d.savings || 0) || [0]));
          return bMaxSavings - aMaxSavings;
        } else if (recommendationType === 'new') {
          // Sort by created date (assuming newer entries are "new spots")
          // Since we don't have created_at, we'll use ID as proxy (higher ID = newer)
          return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
        }

        return 0;
      });
  }, [restaurants, location, referenceLocation, recommendationType, selectedFilters]);

  console.log('✅ Total restaurants for Discover (all cities, prioritized):', filteredAndSortedRestaurants.length);
  console.log(`📍 Prioritizing city: ${location}`);
  console.log(`🎯 Recommendation type: ${recommendationType}`);

  // Log top 5 restaurants with their distances
  if (filteredAndSortedRestaurants.length > 0 && referenceLocation) {
    console.log('📊 Top 5 restaurants by distance from reference:');
    filteredAndSortedRestaurants.slice(0, 5).forEach((restaurant, index) => {
      const distance = restaurant.latitude && restaurant.longitude
        ? calculateDistance(
            referenceLocation.latitude,
            referenceLocation.longitude,
            restaurant.latitude,
            restaurant.longitude
          )
        : null;
      const formattedDistance = distance
        ? (distance < 10 ? `${distance.toFixed(1)}km` : `${Math.round(distance)}km`)
        : 'no location';
      console.log(`  ${index + 1}. ${restaurant.name} - ${formattedDistance} (City: ${restaurant.city})`);
    });
  }

  const topRecommended = filteredAndSortedRestaurants.slice(0, 3);
  const allRestaurants = filteredAndSortedRestaurants;

  // Preload images for first few visible restaurants
  useEffect(() => {
    if (filteredAndSortedRestaurants.length > 0) {
      const merchantsToPreload = filteredAndSortedRestaurants.slice(0, 5).map(r => ({
        coverImageIds: r.coverImageIds || undefined,
        logoId: r.logoId || undefined,
      }));
      preloadMerchantImages(merchantsToPreload, 5);
    }
  }, [filteredAndSortedRestaurants]);

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleBookingComplete = (bookingData: any, restaurant: any) => {
    console.log('📋 Booking completed - RAW:', bookingData);
    console.log('📋 Restaurant data - RAW:', restaurant);

    // Map the booking data to match the Booking interface
    const mappedBooking = {
      id: bookingData.id || bookingData.bookingId || '',
      user_id: bookingData.userId || bookingData.user_id || '',
      restaurant_id: bookingData.merchantId || bookingData.merchant_id || '',
      booking_date: bookingData.bookingDate || bookingData.booking_date || '',
      booking_time: bookingData.booking_time || bookingData.bookingTime || '',
      party_size: bookingData.guests || bookingData.party_size || 1,
      booking_type: 'single' as const,
      status: (bookingData.status || 'confirmed') as 'reserved' | 'confirmed' | 'cancelled',
      created_at: bookingData.createdAt || bookingData.created_at || new Date().toISOString(),
    };

    // Prefer restaurant data from API response, fallback to passed restaurant
    const apiRestaurant = bookingData.restaurant || bookingData.merchant;
    const restaurantData = apiRestaurant || restaurant;

    // Map restaurant data to match Restaurant interface
    const mappedRestaurant = {
      id: restaurantData.id || restaurant.id || '',
      name: restaurantData.name || restaurant.name || '',
      address: restaurantData.address || restaurant.address || '',
      category: 'Restaurant' as any,
      image_url: restaurantData.image_url || restaurant.image || restaurant.image_url,
    };

    console.log('✅ Mapped booking:', mappedBooking);
    console.log('✅ Mapped restaurant:', mappedRestaurant);

    // Validate required fields before showing confirmation
    if (!mappedBooking.id || !mappedBooking.booking_date || !mappedBooking.booking_time) {
      console.error('❌ Missing required booking fields:', {
        id: mappedBooking.id,
        booking_date: mappedBooking.booking_date,
        booking_time: mappedBooking.booking_time,
      });
      // Don't set state if data is invalid - this will prevent showing broken confirmation
      return;
    }

    if (!mappedRestaurant.name || !mappedRestaurant.address) {
      console.error('❌ Missing required restaurant fields:', {
        name: mappedRestaurant.name,
        address: mappedRestaurant.address,
      });
      return;
    }

    setCompletedBooking(mappedBooking);
    setBookingRestaurant(mappedRestaurant);
    setSelectedRestaurant(null);
  };

  // Show booking confirmation if a booking was just completed
  if (completedBooking && bookingRestaurant) {
    return (
      <BookingConfirmation
        booking={completedBooking}
        restaurant={bookingRestaurant}
        onGoToBookings={() => {
          setCompletedBooking(null);
          setBookingRestaurant(null);
          onNavigateToBookings();
        }}
        onExploreMore={() => {
          setCompletedBooking(null);
          setBookingRestaurant(null);
        }}
      />
    );
  }

  if (selectedRestaurant) {
    console.log('🔍 DiscoverView passing restaurant to MerchantDetails:', {
      id: selectedRestaurant.id,
      name: selectedRestaurant.name,
      specialty: selectedRestaurant.specialty,
      subcategoryName: selectedRestaurant.subcategoryName,
    });

    return (
      <MerchantDetails
        restaurant={{
          ...selectedRestaurant,
          image: getOptimizedImageUrl(
            selectedRestaurant.coverImageIds?.[0] || selectedRestaurant.logoId || selectedRestaurant.image_url,
            'merchant',
            { width: 1200, height: 800 }
          ),
          specialty: selectedRestaurant.specialty && selectedRestaurant.specialty.length > 0
            ? selectedRestaurant.specialty
            : [],
          subcategoryName: selectedRestaurant.subcategoryName,
          city: extractCityFromAddress(selectedRestaurant.address || '', selectedRestaurant.city),
          status: 'Open',
          address: selectedRestaurant.address,
          rating: selectedRestaurant.rating || 0,
          reviewCount: selectedRestaurant.reviewCount || 0,
          latitude: selectedRestaurant.latitude,
          longitude: selectedRestaurant.longitude,
          coverImageIds: selectedRestaurant.coverImageIds ?? undefined,
          logoId: selectedRestaurant.logoId ?? undefined,
          open_days: selectedRestaurant.open_days,
          open_time: selectedRestaurant.open_time,
          businessType: selectedRestaurant.businessType,
          availableSlots: selectedRestaurant.availableSlots,
          occupiedSlots: selectedRestaurant.occupiedSlots,
          totalSlots: selectedRestaurant.totalSlots,
          returnSlots: selectedRestaurant.returnSlots,
          unitPrice: selectedRestaurant.unitPrice,
          unitMin: selectedRestaurant.unitMin,
          parentMerchantId: selectedRestaurant.parentMerchantId,
        }}
        onBack={() => setSelectedRestaurant(null)}
        onBookingComplete={handleBookingComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden">
      <div className="bg-white px-6 pt-5 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowCityModal(true)}
            className="flex items-center gap-2 hover:bg-gray-50 transition-colors rounded-lg px-2 py-1 -ml-2"
          >
            <MapPin className="w-5 h-5 text-slate-700" />
            <span className="font-semibold text-slate-900 text-lg">
              {detectingLocation ? 'Detecting...' : location}
            </span>
            <ChevronDown className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-slate-700" />
            {selectedFilters.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold">
                {selectedFilters.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setRecommendationType('recommended')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              recommendationType === 'recommended'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => setRecommendationType('popular')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              recommendationType === 'popular'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            Most Popular
          </button>
          <button
            onClick={() => setRecommendationType('deals')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              recommendationType === 'deals'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            Best Deals
          </button>
          <button
            onClick={() => setRecommendationType('new')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              recommendationType === 'new'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            New Spots
          </button>
        </div>
      </div>

      <div key={`${location}-${recommendationType}`} className="flex-1 overflow-y-auto overflow-x-hidden pb-32">
        {allRestaurants.map((restaurant, index) => (
          <div key={restaurant.id}>
            {index === 0 && (
              <>
                <div
                  onClick={() => handleRestaurantClick(restaurant)}
                  className="px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-4">
                    <img
                      src={getOptimizedImageUrl(restaurant.coverImageIds?.[0] || restaurant.logoId || restaurant.image_url, 'merchant', { width: 400, height: 400 })}
                      alt={restaurant.name}
                      className="w-24 h-24 rounded-lg object-cover"
                      loading={index < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={(e) => {
                        console.error(`Image failed for ${restaurant.name}:`, restaurant.coverImageIds, restaurant.logoId);
                        const img = e.currentTarget;
                        if (!img.src.includes('unsplash.com')) {
                          img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';
                        }
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{restaurant.name}</h3>
                      <div className="flex items-center gap-1 mb-1">
                        {restaurant.reviewCount > 0 && (
                          <>
                            <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                            <span className="text-sm font-medium text-slate-700">{restaurant.rating?.toFixed(1)}</span>
                            <span className="text-sm text-slate-500 mx-1">|</span>
                          </>
                        )}
                        {formatDistance(restaurant) && (
                          <>
                            <span className="text-sm font-medium text-slate-700">{formatDistance(restaurant)}</span>
                            <span className="text-sm text-slate-500 mx-1">|</span>
                          </>
                        )}
                        <span className="text-sm text-slate-600 truncate">
                          {restaurant.subcategoryName || restaurant.category || 'Restaurant'}
                        </span>
                      </div>
                      {restaurant.occupiedSlots > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs text-orange-600">⚡</span>
                          <span className="text-xs text-slate-600">{restaurant.occupiedSlots} PB Available</span>
                        </div>
                      )}
                      {restaurant.deals && restaurant.deals.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {restaurant.deals.slice(0, 3).map((deal, idx) => (
                            <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0">
                              {deal.saveValue || deal.savings ? `Save €${deal.saveValue || deal.savings}` : deal.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <h2 className="font-bold text-slate-900 text-lg mb-4">Top Recommended</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
                    {topRecommended.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => handleRestaurantClick(rec)}
                        className="flex-shrink-0 w-40 cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden mb-2">
                          <img
                            src={getOptimizedImageUrl(rec.coverImageIds?.[0] || rec.logoId || rec.image_url, 'merchant', { width: 400, height: 400 })}
                            alt={rec.name}
                            className="w-full h-40 object-cover"
                            onError={(e) => {
                              console.error(`Top recommended image failed for ${rec.name}:`, rec.coverImageIds, rec.logoId);
                              const img = e.currentTarget;
                              if (!img.src.includes('unsplash.com')) {
                                img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';
                              }
                            }}
                          />
                          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg p-2.5">
                            <h3 className="font-semibold text-xs text-slate-900 mb-1.5 truncate">{rec.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-slate-600 mb-1.5">
                              <span>
                                🍽️ {rec.subcategoryName || rec.category || 'Drink, Meat, Curry'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {rec.reviewCount > 0 && (
                                <>
                                  <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                                  <span className="text-xs font-medium text-slate-700">{rec.rating?.toFixed(1)}</span>
                                </>
                              )}
                              {formatDistance(rec) && (
                                <>
                                  <span className="text-xs text-slate-500">|</span>
                                  <span className="text-xs font-medium text-slate-700">{formatDistance(rec)}</span>
                                </>
                              )}
                              {rec.occupiedSlots > 0 && (
                                <span className="text-xs text-green-600 ml-auto font-medium">⚡ {rec.occupiedSlots} PB</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {index > 0 && (
              <div
                onClick={() => handleRestaurantClick(restaurant)}
                className="px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex gap-4">
                  <img
                    src={getOptimizedImageUrl(restaurant.coverImageIds?.[0] || restaurant.logoId || restaurant.image_url, 'merchant', { width: 400, height: 400 })}
                    alt={restaurant.name}
                    className="w-24 h-24 rounded-lg object-cover"
                    onError={(e) => {
                      console.error(`List image failed for ${restaurant.name}:`, restaurant.coverImageIds, restaurant.logoId);
                      const img = e.currentTarget;
                      if (!img.src.includes('unsplash.com')) {
                        img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';
                      }
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{restaurant.name}</h3>
                    <div className="flex items-center gap-1 mb-1">
                      {restaurant.reviewCount > 0 && (
                        <>
                          <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                          <span className="text-sm font-medium text-slate-700">{restaurant.rating?.toFixed(1)}</span>
                          <span className="text-sm text-slate-500 mx-1">|</span>
                        </>
                      )}
                      {formatDistance(restaurant) && (
                        <>
                          <span className="text-sm font-medium text-slate-700">{formatDistance(restaurant)}</span>
                          <span className="text-sm text-slate-500 mx-1">|</span>
                        </>
                      )}
                      <span className="text-sm text-slate-600 truncate">
                        {restaurant.subcategoryName || restaurant.category || 'Restaurant'}
                      </span>
                    </div>
                    {restaurant.occupiedSlots > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-xs text-orange-600">⚡</span>
                        <span className="text-xs text-slate-600">{restaurant.occupiedSlots} PB Available</span>
                      </div>
                    )}
                    {restaurant.deals && restaurant.deals.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {restaurant.deals.slice(0, 3).map((deal, idx) => (
                          <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0">
                            {deal.saveValue || deal.savings ? `Save €${deal.saveValue || deal.savings}` : deal.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNavigation
        onDiscoverClick={() => {}}
        onMapClick={onBack}
        onBookingsClick={onNavigateToBookings}
        activeView="discover"
        unreadInvitesCount={unreadInvitesCount}
      />

      {showCityModal && (
        <CitySelectionModal
          selectedCity={location}
          onSelectCity={(city) => {
            console.log('🏙️ City manually selected:', city);
            setLocation(city);
            setShowCityModal(false);
          }}
          onClose={() => setShowCityModal(false)}
        />
      )}

      {showFilterModal && (
        <FilterModal
          selectedFilters={selectedFilters}
          onToggleFilter={(filter) => {
            setSelectedFilters(prev =>
              prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
            );
          }}
          onClose={() => setShowFilterModal(false)}
          onApply={() => {}}
        />
      )}
    </div>
  );
}
