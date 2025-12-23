import { useState, useEffect, useRef } from 'react';
import { Search, Heart, MapPin, X } from 'lucide-react';
import { Restaurant } from '../types';
import BottomNavigation from './BottomNavigation';
import { createCustomMarkerIcon, isBusinessOpen } from '../utils/mapMarkers';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { preloadMerchantImages } from '../utils/imagePreloader';
import { likedMerchantsEdgeAPI } from '../services/mobile';
import { isFeatureEnabled } from '../services/apiConfig';
import { MapDiningOnlyModal, MapChargingOnlyModal, MapDiningAndChargingModal } from './MapLocationModal';
import { useUserLocation } from '../utils/LocationContext';

function formatOpeningHours(openDays: string | null | undefined, openTime: string | null | undefined): string {
  if (!openDays && !openTime) return 'Hours Available';

  // Parse time to extract just the hours (handle formats like "11:00-17:00" or "s 11:00-17:00")
  let timeDisplay = openTime || '';
  const timeMatch = timeDisplay.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (timeMatch) {
    timeDisplay = `${timeMatch[1]} – ${timeMatch[2]}`;
  }

  // Parse days: "sunday,monday,tuesday,wednesday,thursday,friday,saturday"
  if (!openDays) return timeDisplay || 'Hours Available';

  const daysArray = openDays.toLowerCase().split(',').map(d => d.trim()).filter(d => d.length > 2);

  if (daysArray.length === 0) return timeDisplay || 'Hours Available';

  // Get abbreviated day names
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

  // If all 7 days, show first and last
  if (daysArray.length === 7) {
    return `${firstDay} – ${lastDay} | ${timeDisplay}`;
  }

  // If multiple days, show range
  if (daysArray.length > 1) {
    return `${firstDay} – ${lastDay} | ${timeDisplay}`;
  }

  // Single day
  return `${firstDay} | ${timeDisplay}`;
}

interface MapViewProps {
  restaurants: Restaurant[];
  onRestaurantSelect: (restaurant: Restaurant) => void;
  onNavigateToBookings: () => void;
  onOpenMenu: () => void;
  onOpenDiscover: () => void;
  onOpenPromotions: () => void;
  unreadInvitesCount?: number;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export default function MapView({ restaurants, onRestaurantSelect, onNavigateToBookings, onOpenMenu, onOpenDiscover, onOpenPromotions, unreadInvitesCount = 0, userProfile }: MapViewProps) {
  const { userLocation: contextLocation, isLoading: isLoadingLocation, refreshLocation } = useUserLocation();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(restaurants);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userLocationMarkerRef = useRef<any>(null);
  const pulseMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const pulseIntervalRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [likedMerchants, setLikedMerchants] = useState<Set<string>>(new Set());
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const permissionCheckAttemptedRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Convert context location to map format
  const userLocation = contextLocation ? {
    lat: contextLocation.latitude,
    lng: contextLocation.longitude
  } : null;

  console.log('🗺️ MapView render - restaurants:', restaurants.length);
  console.log('📍 MapView using location from context:', userLocation);

  // Click outside to collapse search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSearchExpanded && searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchExpanded(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded]);

  // Real-time search filtering
  useEffect(() => {
    // Show all merchants with valid coordinates
    const validRestaurants = restaurants.filter(restaurant => {
      const lat = restaurant.latitude;
      const lng = restaurant.longitude;

      // Ensure coordinates are valid numbers and not null/undefined/0
      const hasValidLocation =
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0;

      if (!hasValidLocation) {
        console.log(`⚠️ Filtering out ${restaurant.name} - invalid coordinates:`, { lat, lng });
      }

      return hasValidLocation;
    });

    console.log('🗺️ MapView - Total merchants received:', restaurants.length);
    console.log('🗺️ MapView - Valid merchants with coordinates:', validRestaurants.length);

    if (validRestaurants.length > 0) {
      console.log('📍 Sample valid merchant:', {
        name: validRestaurants[0].name,
        lat: validRestaurants[0].latitude,
        lng: validRestaurants[0].longitude
      });
    }

    if (!searchQuery.trim()) {
      setFilteredRestaurants(validRestaurants);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = validRestaurants.filter(restaurant => {
      const name = restaurant.name?.toLowerCase() || '';
      const category = restaurant.category?.toLowerCase() || '';
      const address = restaurant.address?.toLowerCase() || '';

      return name.includes(query) ||
             category.includes(query) ||
             address.includes(query);
    });

    setFilteredRestaurants(filtered);
    console.log(`🔍 Search "${searchQuery}": ${filtered.length} results`);
  }, [searchQuery, restaurants]);

  // Preload images for visible merchants
  useEffect(() => {
    if (filteredRestaurants.length > 0) {
      const merchantsToPreload = filteredRestaurants.slice(0, 15).map(r => ({
        coverImageIds: r.coverImageIds || undefined,
        logoId: r.logoId || undefined,
      }));
      preloadMerchantImages(merchantsToPreload, 15);
      console.log('🖼️ Preloading images for', merchantsToPreload.length, 'visible merchants on map');
    }
  }, [filteredRestaurants]);

  useEffect(() => {
    // Use cached location from context - no need to fetch again
    if (contextLocation) {
      console.log('✅ Using cached location from context:', contextLocation);
      setLocationPermission('granted');
      if (contextLocation.accuracy) {
        setLocationAccuracy(contextLocation.accuracy);
      }
    } else if (!isLoadingLocation) {
      console.log('⚠️ No location available from context');
      setLocationPermission('denied');
    }
  }, [contextLocation, isLoadingLocation]);



  // Separate effect to initialize map once
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (mapInstanceRef.current) return;

    // Check if we have user location at initialization time
    const hasUserLocation = !!userLocation;
    const currentUserLocation = userLocation;
    const currentAccuracy = locationAccuracy;
    const defaultLocation = { lat: 52.3676, lng: 4.9041 }; // Amsterdam
    const initialLocation = hasUserLocation ? currentUserLocation : defaultLocation;
    const initialZoom = hasUserLocation ? 13 : 11;

    console.log('🗺️ Initializing map at location:', initialLocation, hasUserLocation ? '(user location)' : '(default location)');

    const map = new window.google.maps.Map(mapRef.current, {
      center: initialLocation!,
      zoom: initialZoom,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      rotateControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    mapInstanceRef.current = map;
    setIsMapReady(true);

    // Only create user location marker if we have a real user location
    if (hasUserLocation && currentUserLocation) {
      userLocationMarkerRef.current = new window.google.maps.Marker({
        position: currentUserLocation,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        title: 'Your Location',
        zIndex: 10000,
        optimized: false,
      });

      accuracyCircleRef.current = new window.google.maps.Circle({
        map: map,
        center: currentUserLocation,
        radius: currentAccuracy || 50,
        strokeColor: '#4285F4',
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        zIndex: 9000,
      });

      pulseMarkerRef.current = new window.google.maps.Marker({
        position: currentUserLocation,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          strokeColor: '#4285F4',
          strokeOpacity: 0.5,
          strokeWeight: 1,
        },
        zIndex: 9500,
        optimized: false,
      });

      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }

      let pulseScale = 15;
      let growing = true;
      pulseIntervalRef.current = setInterval(() => {
        if (pulseMarkerRef.current) {
          if (growing) {
            pulseScale += 0.5;
            if (pulseScale >= 25) growing = false;
          } else {
            pulseScale -= 0.5;
            if (pulseScale <= 15) growing = true;
          }

          const opacity = 0.3 - ((pulseScale - 15) / 20) * 0.25;

          pulseMarkerRef.current.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: pulseScale,
            fillColor: '#4285F4',
            fillOpacity: Math.max(opacity, 0.05),
            strokeColor: '#4285F4',
            strokeOpacity: Math.max(opacity * 2, 0.1),
            strokeWeight: 1,
          });
        }
      }, 50);

      console.log('✅ Map initialized with user location marker');
    } else {
      console.log('✅ Map initialized without user location marker (waiting for location)');
    }
  }, []);

  // Add user location marker when it becomes available after map initialization
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !window.google) return;

    // If markers already exist, skip (already handled in initialization)
    if (userLocationMarkerRef.current) return;

    console.log('📍 Adding user location marker to existing map:', userLocation);

    userLocationMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
      title: 'Your Location',
      zIndex: 10000,
      optimized: false,
    });

    accuracyCircleRef.current = new window.google.maps.Circle({
      map: mapInstanceRef.current,
      center: userLocation,
      radius: locationAccuracy || 50,
      strokeColor: '#4285F4',
      strokeOpacity: 0.3,
      strokeWeight: 1,
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      zIndex: 9000,
    });

    pulseMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: '#4285F4',
        fillOpacity: 0.2,
        strokeColor: '#4285F4',
        strokeOpacity: 0.5,
        strokeWeight: 1,
      },
      zIndex: 9500,
      optimized: false,
    });

    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
    }

    let pulseScale = 15;
    let growing = true;
    pulseIntervalRef.current = setInterval(() => {
      if (pulseMarkerRef.current) {
        if (growing) {
          pulseScale += 0.5;
          if (pulseScale >= 25) growing = false;
        } else {
          pulseScale -= 0.5;
          if (pulseScale <= 15) growing = true;
        }

        const opacity = 0.3 - ((pulseScale - 15) / 20) * 0.25;

        pulseMarkerRef.current.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: pulseScale,
          fillColor: '#4285F4',
          fillOpacity: Math.max(opacity, 0.05),
          strokeColor: '#4285F4',
          strokeOpacity: Math.max(opacity * 2, 0.1),
          strokeWeight: 1,
        });
      }
    }, 50);

    // Center map on user location
    mapInstanceRef.current.setCenter(userLocation);
    mapInstanceRef.current.setZoom(13);

    console.log('✅ User location marker added to map');
  }, [userLocation, locationAccuracy, isMapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    console.log('📍 Creating merchant markers:', filteredRestaurants.length);

    filteredRestaurants.forEach((restaurant) => {
      if (!restaurant.latitude || !restaurant.longitude) {
        console.warn(`Skipping restaurant ${restaurant.name} - missing coordinates`);
        return;
      }

      const isOpen = isBusinessOpen(restaurant.open_time, restaurant.open_days);

      // Determine the correct category icon based on business type
      let markerCategory: any = restaurant.category || 'restaurant';
      const isChargingOnly = restaurant.businessType === 'chargingonly' || restaurant.merchantCategory === 'chargingonly';
      if (isChargingOnly) {
        markerCategory = 'charging_station';
      }

      console.log(`Creating marker for ${restaurant.name}:`, {
        category: markerCategory,
        lat: restaurant.latitude,
        lng: restaurant.longitude,
        isOpen
      });

      const iconUrl = createCustomMarkerIcon(markerCategory, isOpen);

      const marker = new window.google.maps.Marker({
        position: { lat: restaurant.latitude, lng: restaurant.longitude },
        map: map,
        icon: {
          url: iconUrl,
          scaledSize: new window.google.maps.Size(36, 48),
          anchor: new window.google.maps.Point(18, 48),
        },
        title: restaurant.name,
        zIndex: 2000,
      });

      marker.addListener('click', () => {
        console.log('📍 MapView: Marker clicked:', {
          name: restaurant.name,
          specialty: restaurant.specialty,
          id: restaurant.id,
        });
        setSelectedRestaurant(restaurant);
        map.panTo({ lat: restaurant.latitude, lng: restaurant.longitude });
      });

      markersRef.current.push(marker);
    });

    console.log('✅ Created', markersRef.current.length, 'merchant markers');
  }, [filteredRestaurants, isMapReady]);

  useEffect(() => {
    const loadLikedMerchants = async () => {
      if (!isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) return;

      try {
        const liked = await likedMerchantsEdgeAPI.getLikedMerchants();
        const likedIds = new Set(liked.map((m: any) => m.merchantId || m.id));
        setLikedMerchants(likedIds);
      } catch (error) {
        console.error('Failed to load liked merchants:', error);
      }
    };

    loadLikedMerchants();
  }, []);

  useEffect(() => {
    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        console.log('🛑 Pulse animation stopped');
      }
    };
  }, []);

  useEffect(() => {
    if (!userLocationMarkerRef.current || !userLocation || !mapInstanceRef.current) {
      console.log('⏭️ Skipping location marker update - not ready:', {
        hasMarker: !!userLocationMarkerRef.current,
        hasLocation: !!userLocation,
        hasMap: !!mapInstanceRef.current
      });
      return;
    }

    const newPos = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
    const currentPos = userLocationMarkerRef.current.getPosition();

    const shouldUpdate = !currentPos ||
                        Math.abs(currentPos.lat() - newPos.lat()) > 0.00001 ||
                        Math.abs(currentPos.lng() - newPos.lng()) > 0.00001;

    if (shouldUpdate) {
      console.log('📍 UPDATING USER LOCATION MARKER (independent of merchant markers):', {
        from: currentPos ? { lat: currentPos.lat(), lng: currentPos.lng() } : 'none',
        to: { lat: newPos.lat(), lng: newPos.lng() },
        accuracy: locationAccuracy ? `${locationAccuracy.toFixed(1)}m` : 'unknown',
        distance: currentPos ?
          Math.sqrt(
            Math.pow(currentPos.lat() - newPos.lat(), 2) +
            Math.pow(currentPos.lng() - newPos.lng(), 2)
          ) * 111000 + 'm' : 'initial'
      });

      if (currentPos) {
        animateMarker(userLocationMarkerRef.current, newPos);
        if (pulseMarkerRef.current) {
          animateMarker(pulseMarkerRef.current, newPos);
        }
      } else {
        userLocationMarkerRef.current.setPosition(newPos);
        if (pulseMarkerRef.current) {
          pulseMarkerRef.current.setPosition(newPos);
        }
      }

      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter(newPos);
        if (locationAccuracy) {
          accuracyCircleRef.current.setRadius(locationAccuracy);
        }
      }

      console.log('✅ User location marker updated successfully');
    } else {
      console.log('⏭️ Location change too small, skipping update');
    }
  }, [userLocation, locationAccuracy]);

  const animateMarker = (marker: any, newPosition: any) => {
    const startPosition = marker.getPosition();
    if (!startPosition) {
      console.log('🎯 No start position - setting directly');
      marker.setPosition(newPosition);
      return;
    }

    const startLat = startPosition.lat();
    const startLng = startPosition.lng();
    const endLat = newPosition.lat();
    const endLng = newPosition.lng();

    const distance = Math.sqrt(
      Math.pow(endLat - startLat, 2) +
      Math.pow(endLng - startLng, 2)
    ) * 111000;

    console.log(`🎬 Animating marker ${distance.toFixed(1)}m`);

    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentLat = startLat + (endLat - startLat) * easeProgress;
      const currentLng = startLng + (endLng - startLng) * easeProgress;

      marker.setPosition(new window.google.maps.LatLng(currentLat, currentLng));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log('✅ Animation complete');
      }
    };

    animate();
  };

  const handleToggleLike = async () => {
    if (!selectedRestaurant || isLoadingLike) return;

    const merchantIdToUse = selectedRestaurant.parentMerchantId || selectedRestaurant.id;
    const merchantId = selectedRestaurant.id;
    const wasLiked = likedMerchants.has(merchantIdToUse);
    const newLikedState = new Set(likedMerchants);

    if (wasLiked) {
      newLikedState.delete(merchantIdToUse);
    } else {
      newLikedState.add(merchantIdToUse);
    }

    setLikedMerchants(newLikedState);
    setIsLoadingLike(true);

    try {
      if (wasLiked) {
        await likedMerchantsEdgeAPI.unlikeMerchant(merchantIdToUse);
      } else {
        await likedMerchantsEdgeAPI.likeMerchant(merchantIdToUse);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setLikedMerchants(likedMerchants);
      alert(`Failed to ${wasLiked ? 'unlike' : 'like'} merchant`);
    } finally {
      setIsLoadingLike(false);
    }
  };

  const handleBookNow = () => {
    if (selectedRestaurant) {
      onRestaurantSelect(selectedRestaurant);
    }
  };

  const handleRecenterMap = async () => {
    if (!mapInstanceRef.current) {
      console.warn('⚠️ Map not ready for recenter');
      return;
    }

    console.log('🎯 USER REQUESTED: Center map to my current location');

    try {
      // Refresh location from context
      await refreshLocation();

      // Use the updated location from context
      if (userLocation) {
        console.log('✅ Centering map to refreshed location:', userLocation);
        mapInstanceRef.current.setCenter(userLocation);
        mapInstanceRef.current.setZoom(16);
      } else {
        console.error('❌ No location available after refresh');
      }
    } catch (error) {
      console.error('❌ Error refreshing location for recenter:', error);

      // Fallback to current location if refresh fails
      if (userLocation) {
        console.log('📍 Fallback: Using cached location');
        mapInstanceRef.current.setCenter(userLocation);
        mapInstanceRef.current.setZoom(15);
      } else {
        console.error('❌ No location available to center on');
      }
    }
  };

  const handleSearchResultClick = (restaurant: Restaurant) => {
    if (mapInstanceRef.current && restaurant.latitude && restaurant.longitude) {
      mapInstanceRef.current.panTo({ lat: restaurant.latitude, lng: restaurant.longitude });
      mapInstanceRef.current.setZoom(15);
      setSelectedRestaurant(restaurant);
      setSearchQuery('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
        <div className="relative flex-1 w-full h-full min-h-0">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />

        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center gap-2 px-4 py-3">
            <button onClick={onOpenMenu} className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-colors flex-shrink-0 shadow-sm">
              <img src="/menu-alt-1.svg" alt="Menu" className="w-6 h-6" />
            </button>

            <div className="relative flex-1 min-w-0 max-w-md" ref={searchContainerRef}>
              {!isSearchExpanded ? (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  <Search className="w-5 h-5 text-gray-400" />
                </button>
              ) : (
                <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm transition-all duration-300 px-4 py-2 w-full">
                    <button
                      className="p-2 hover:bg-gray-100/50 rounded-full transition-colors flex-shrink-0 -ml-2"
                    >
                      <Search className="w-5 h-5 text-gray-400" />
                    </button>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search restaurants..."
                      className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400 ml-2 text-sm min-w-0"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                {searchQuery && filteredRestaurants.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs text-gray-500 font-medium">
                        {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'result' : 'results'} found
                      </div>
                      {filteredRestaurants.slice(0, 10).map((restaurant) => (
                        <button
                          key={restaurant.id}
                          onClick={() => handleSearchResultClick(restaurant)}
                          className="w-full text-left px-3 py-3 hover:bg-gray-100/80 rounded-xl transition-colors flex items-start gap-3 group"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img
                              src={getOptimizedImageUrl(
                                restaurant.coverImageIds?.[0] || restaurant.logoId || restaurant.image_url,
                                'merchant',
                                { width: 100, height: 100 }
                              )}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (!img.src.includes('unsplash.com')) {
                                  img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop';
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm group-hover:text-[#00BFA6] transition-colors truncate">
                              {restaurant.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {restaurant.category}
                            </div>
                            {restaurant.address && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {restaurant.address}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredRestaurants.length > 10 && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center">
                          +{filteredRestaurants.length - 10} more results
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            <button onClick={onOpenPromotions} className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 bg-[#B2E9E9]">
              <img src="/discount.svg" alt="Discount" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {selectedRestaurant && (() => {
          const hasDeals = selectedRestaurant.deals && selectedRestaurant.deals.length > 0;
          const hasStation = selectedRestaurant.hasStation || (selectedRestaurant.occupiedSlots !== undefined && selectedRestaurant.occupiedSlots >= 0);
          const partnershipType = selectedRestaurant.partnershipType?.toLowerCase();
          const businessType = selectedRestaurant.businessType;

          console.log('🗺️ MapView Modal Logic:', {
            name: selectedRestaurant.name,
            businessType,
            partnershipType,
            hasDeals,
            hasStation
          });

          const locationData = {
            id: selectedRestaurant.id,
            name: selectedRestaurant.name,
            address: selectedRestaurant.address,
            specialty: selectedRestaurant.specialty,
            coverImageIds: selectedRestaurant.coverImageIds,
            logoId: selectedRestaurant.logoId,
            image: selectedRestaurant.image_url,
            rating: selectedRestaurant.rating,
            reviewCount: selectedRestaurant.reviewCount,
            open_days: selectedRestaurant.open_days,
            open_time: selectedRestaurant.open_time,
            deals: selectedRestaurant.deals,
            occupiedSlots: selectedRestaurant.occupiedSlots,
            totalSlots: selectedRestaurant.totalSlots,
            availableSlots: selectedRestaurant.availableSlots,
            returnSlots: selectedRestaurant.returnSlots,
            hasStation: selectedRestaurant.hasStation,
            subcategoryName: selectedRestaurant.subcategoryName,
            businessType: selectedRestaurant.businessType,
            unitPrice: selectedRestaurant.unitPrice,
            unitMin: selectedRestaurant.unitMin,
          };

          const handleCloseModal = () => {
            console.log('🗺️ MapView: Closing modal and returning to map');
            setSelectedRestaurant(null);
          };

          const merchantIdToCheck = selectedRestaurant.parentMerchantId || selectedRestaurant.id;

          // Prioritize business_type over hasStation/hasDeals combination
          if (businessType === 'chargingonly' || partnershipType === 'map_chargingonly') {
            return (
              <MapChargingOnlyModal
                location={locationData}
                isLiked={likedMerchants.has(merchantIdToCheck)}
                onClose={handleCloseModal}
                onToggleLike={handleToggleLike}
                isLoadingLike={isLoadingLike}
                userProfile={userProfile}
              />
            );
          } else if (businessType === 'diningandcharging' || partnershipType === 'map_both') {
            return (
              <MapDiningAndChargingModal
                location={locationData}
                isLiked={likedMerchants.has(merchantIdToCheck)}
                onClose={handleCloseModal}
                onToggleLike={handleToggleLike}
                onBookDining={handleBookNow}
                isLoadingLike={isLoadingLike}
                userProfile={userProfile}
              />
            );
          } else if (businessType === 'diningonly' || partnershipType === 'map_diningonly') {
            return (
              <MapDiningOnlyModal
                location={locationData}
                isLiked={likedMerchants.has(merchantIdToCheck)}
                onClose={handleCloseModal}
                onToggleLike={handleToggleLike}
                onBookDining={handleBookNow}
                isLoadingLike={isLoadingLike}
                userProfile={userProfile}
              />
            );
          } else {
            // Fallback based on hasStation/hasDeals for legacy data without business_type
            if (hasStation && !hasDeals) {
              return (
                <MapChargingOnlyModal
                  location={locationData}
                  isLiked={likedMerchants.has(merchantIdToCheck)}
                  onClose={handleCloseModal}
                  onToggleLike={handleToggleLike}
                  isLoadingLike={isLoadingLike}
                  userProfile={userProfile}
                />
              );
            } else if (hasStation && hasDeals) {
              return (
                <MapDiningAndChargingModal
                  location={locationData}
                  isLiked={likedMerchants.has(merchantIdToCheck)}
                  onClose={handleCloseModal}
                  onToggleLike={handleToggleLike}
                  onBookDining={handleBookNow}
                  isLoadingLike={isLoadingLike}
                  userProfile={userProfile}
                />
              );
            } else {
              return (
                <MapDiningOnlyModal
                  location={locationData}
                  isLiked={likedMerchants.has(merchantIdToCheck)}
                  onClose={handleCloseModal}
                  onToggleLike={handleToggleLike}
                  onBookDining={handleBookNow}
                  isLoadingLike={isLoadingLike}
                  userProfile={userProfile}
                />
              );
            }
          }
        })()}

          <BottomNavigation
            onDiscoverClick={onOpenDiscover}
            onMapClick={() => {}}
            onBookingsClick={onNavigateToBookings}
            activeView="map"
            unreadInvitesCount={unreadInvitesCount}
          />

          <div className="absolute bottom-36 right-6 z-30">
            <button
              onClick={handleRecenterMap}
              className="bg-white p-2 rounded-full shadow-2xl hover:shadow-xl transition-all hover:scale-110"
            >
              <img src="/location-target-1-remix.svg" alt="Center Location" className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
