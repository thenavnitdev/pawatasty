import { ChevronLeft, Heart, Share2, Info, MapPin, Star, ThumbsUp, User } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import DealBookingModal from './DealBookingModal';
import DealNoteModal from './DealNoteModal';
import ReviewForm from './ReviewForm';
import ChargingStationModal from './ChargingStationModal';
import { reviewsAPI, likedMerchantsAPI, merchantsAPI, merchantsEdgeAPI, reviewsEdgeAPI, likedMerchantsEdgeAPI, menuItemsAPI, type MenuItem } from '../services/mobile';
import { Review, Deal } from '../types';
import { getDealImageUrl, getOptimizedImageUrl } from '../utils/imageUtils';
import { preloadMerchantImages } from '../utils/imagePreloader';
import { isFeatureEnabled } from '../services/apiConfig';

interface MerchantDetailsProps {
  restaurant: {
    id: string;
    name: string;
    specialty: string[];
    city: string;
    status: string;
    image: string;
    address: string;
    rating: number;
    reviewCount: number;
    deals?: Deal[];
    latitude?: number;
    longitude?: number;
    coverImageIds?: string[];
    logoId?: string;
    open_days?: string;
    open_time?: string;
    businessType?: string;
    availableSlots?: number;
    occupiedSlots?: number;
    totalSlots?: number;
    returnSlots?: number;
    unitPrice?: string;
    unitMin?: string;
    parentMerchantId?: string;
    subcategoryName?: string;
  };
  onBack: () => void;
  onBookingComplete: (bookingData: any, restaurant: any) => void;
}

export default function MerchantDetails({ restaurant, onBack, onBookingComplete }: MerchantDetailsProps) {
  console.log('🏪 MerchantDetails received:', {
    id: restaurant.id,
    name: restaurant.name,
    parentMerchantId: restaurant.parentMerchantId,
    reviewCount: restaurant.reviewCount,
    rating: restaurant.rating,
    businessType: restaurant.businessType,
    availableSlots: restaurant.availableSlots,
    specialty: restaurant.specialty,
    subcategoryName: restaurant.subcategoryName,
    totalSlots: restaurant.totalSlots,
    returnSlots: restaurant.returnSlots,
  });

  console.log('🏷️ Displaying subcategoryName:', restaurant.subcategoryName);

  if (restaurant.businessType === 'chargingonly') {
    console.log('⚡ Rendering ChargingStationModal for:', restaurant.name);
    return (
      <ChargingStationModal
        station={{
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          image: restaurant.image,
          subcategoryName: restaurant.subcategoryName,
          specialty: restaurant.specialty,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          openDays: restaurant.open_days,
          openTime: restaurant.open_time,
          availableSlots: restaurant.availableSlots,
          occupiedSlots: restaurant.occupiedSlots,
          totalSlots: restaurant.totalSlots,
          returnSlots: restaurant.returnSlots,
          unitPrice: restaurant.unitPrice,
          unitMin: restaurant.unitMin,
        }}
        onBack={onBack}
      />
    );
  }

  const [activeTab, setActiveTab] = useState<'about' | 'menu' | 'reviews'>('about');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [featuredDeal, setFeaturedDeal] = useState<Deal | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [showDealNote, setShowDealNote] = useState(false);
  const [isAutoplaying, setIsAutoplaying] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dealRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Initialize with images from props if available
  const getInitialImages = (): string[] => {
    if (restaurant.coverImageIds && restaurant.coverImageIds.length > 0) {
      const images = restaurant.coverImageIds
        .slice(0, 5)
        .map(id => getOptimizedImageUrl(id, 'cover', { width: 1200, height: 600, quality: 85 }))
        .filter(url => url !== null) as string[];

      if (images.length > 0) {
        console.log('🖼️ Using coverImageIds from props:', restaurant.coverImageIds);
        preloadMerchantImages([{ coverImageIds: restaurant.coverImageIds, logoId: restaurant.logoId }], 1);
        return images;
      }
    }

    if (restaurant.logoId) {
      const logoUrl = getOptimizedImageUrl(restaurant.logoId, 'logo', { width: 1200, height: 800 });
      if (logoUrl) return [logoUrl];
    }

    return restaurant.image ? [restaurant.image] : [];
  };

  const [merchantImages, setMerchantImages] = useState<string[]>(getInitialImages());
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [merchantData, setMerchantData] = useState(restaurant);

  useEffect(() => {
    const loadMerchantData = async () => {
      setIsLoadingImages(true);
      try {
        console.log('Loading merchant data for:', restaurant.id);
        const merchant = isFeatureEnabled('USE_EDGE_MERCHANTS')
          ? await merchantsEdgeAPI.getMerchantById(restaurant.id)
          : await merchantsAPI.getMerchantById(restaurant.id);
        console.log('Merchant data received:', merchant);

        // CRITICAL: Always use backend data as single source of truth
        // Do NOT fall back to initial prop data - backend is authoritative
        const backendSubcategory = merchant.subcategoryName || merchant.category_name;
        console.log('🏷️ Subcategory data comparison:', {
          fromInitialProp: restaurant.subcategoryName,
          fromBackend: backendSubcategory,
          usingValue: backendSubcategory
        });

        setMerchantData({
          ...restaurant,
          subcategoryName: backendSubcategory,
          city: merchant.city,
          specialty: merchant.specialty,
          rating: merchant.rating ?? 0,
          reviewCount: merchant.reviewCount ?? 0,
          status: merchant.status,
          address: merchant.address,
          open_days: merchant.open_days,
          open_time: merchant.open_time,
        });

        const coverImages = isFeatureEnabled('USE_EDGE_MERCHANTS')
          ? merchantsEdgeAPI.getMerchantCoverImages(merchant, 5)
          : merchantsAPI.getMerchantCoverImages(merchant, 5);
        console.log('Cover images from API:', coverImages);

        // Only update images if API returned different/better data
        const hasExistingImages = merchantImages.length > 0 && !merchantImages.includes(restaurant.image);
        const hasNewImages = coverImages.length > 0;

        if (hasNewImages) {
          const apiImageIds = merchant.coverImageIds || [];
          const propImageIds = restaurant.coverImageIds || [];
          const imagesChanged = JSON.stringify(apiImageIds) !== JSON.stringify(propImageIds);

          if (imagesChanged || !hasExistingImages) {
            console.log('🔄 Updating images from API (changed or initial load)');
            setMerchantImages(coverImages);
            preloadMerchantImages([merchant], 1);
          } else {
            console.log('✅ Images unchanged, keeping current images');
          }
        } else if (!hasExistingImages) {
          console.warn('No cover images found, trying logoId as fallback');
          if (merchant.logoId) {
            const logoUrl = getOptimizedImageUrl(merchant.logoId, 'merchant', { width: 1200, height: 800 });
            setMerchantImages([logoUrl]);
          } else if (merchant.image_url) {
            const imageUrl = getOptimizedImageUrl(merchant.image_url, 'merchant', { width: 1200, height: 800 });
            setMerchantImages([imageUrl]);
          } else {
            console.warn('No images available, keeping initial state');
          }
        }
      } catch (error) {
        console.error('Failed to load merchant data:', error);
        // Keep existing images on error rather than overwriting with potentially undefined value
        if (merchantImages.length === 0 && restaurant.image) {
          setMerchantImages([restaurant.image]);
        }
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadMerchantData();
  }, [restaurant.id]);

  const images = merchantImages;

  // Convert API deals to component Deal format with proper image URLs and saveValue
  const deals: Deal[] = restaurant.deals && restaurant.deals.length > 0 ? restaurant.deals.map(apiDeal => {
    const imageSource = apiDeal.imageUrl || apiDeal.image || (apiDeal.imageIds && apiDeal.imageIds[0]);

    console.log('🖼️ Deal image mapping:', {
      dealId: apiDeal.id,
      dealIdType: typeof apiDeal.id,
      dealTitle: apiDeal.title,
      imageUrl: apiDeal.imageUrl,
      image: apiDeal.image,
      imageIds: apiDeal.imageIds,
      imageSource: imageSource,
      generatedUrl: getDealImageUrl(imageSource)
    });

    return {
      id: String(apiDeal.id),
      title: apiDeal.title,
      description: apiDeal.description || '',
      discount: apiDeal.discount ? `${apiDeal.discount}% OFF` : 'Deal',
      averagePrice: apiDeal.price || apiDeal.averagePrice || 0,
      image: getDealImageUrl(imageSource),
      badge: apiDeal.discount ? `${apiDeal.discount}% OFF` : apiDeal.badge,
      savings: apiDeal.saveValue || apiDeal.savings || 0,
      duration: 90,
      isOnsite: true
    };
  }) : [];

  // Parse opening hours from restaurant data
  const parseOpeningHours = () => {
    if (!restaurant.open_days || !restaurant.open_time) {
      // Default fallback
      return [
        { day: 'Monday', hours: '11:00 - 21:00' },
        { day: 'Tuesday', hours: '11:00 - 21:00' },
        { day: 'Wednesday', hours: '11:00 - 21:00' },
        { day: 'Thursday', hours: '11:00 - 21:00' },
        { day: 'Friday', hours: '11:00 - 21:00' },
        { day: 'Saturday', hours: '12:00 - 22:00' },
        { day: 'Sunday', hours: '12:00 - 20:00' }
      ];
    }

    // Parse time to extract just the hours (handle formats like "11:00-17:00" or "s 11:00-17:00")
    let timeDisplay = restaurant.open_time;
    const timeMatch = timeDisplay.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      timeDisplay = `${timeMatch[1]} - ${timeMatch[2]}`;
    }

    // Parse days: "sunday,monday,tuesday,wednesday,thursday,friday,saturday"
    const daysArray = restaurant.open_days.toLowerCase().split(',').map(d => d.trim());

    const dayMap: { [key: string]: string } = {
      'sun': 'Sunday', 'sunday': 'Sunday',
      'mon': 'Monday', 'monday': 'Monday',
      'tue': 'Tuesday', 'tuesday': 'Tuesday',
      'wed': 'Wednesday', 'wednesday': 'Wednesday',
      'thu': 'Thursday', 'thursday': 'Thursday',
      'fri': 'Friday', 'friday': 'Friday',
      'sat': 'Saturday', 'saturday': 'Saturday'
    };

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const openDays = daysArray.map(d => dayMap[d.toLowerCase()]).filter(Boolean);

    return allDays.map(day => ({
      day,
      hours: openDays.includes(day) ? timeDisplay : 'Closed'
    }));
  };

  const openingHours = parseOpeningHours();

  // Calculate if restaurant is currently open
  const isCurrentlyOpen = () => {
    if (!restaurant.open_days || !restaurant.open_time) {
      return false;
    }

    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const daysArray = restaurant.open_days.toLowerCase().split(',').map(d => d.trim());

    // Check if today is an open day
    if (!daysArray.includes(currentDay)) {
      return false;
    }

    // Parse opening hours
    const timeMatch = restaurant.open_time.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
      return false;
    }

    const openHour = parseInt(timeMatch[1]);
    const openMinute = parseInt(timeMatch[2]);
    const closeHour = parseInt(timeMatch[3]);
    const closeMinute = parseInt(timeMatch[4]);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  };

  const currentlyOpen = isCurrentlyOpen();

  const handleDealClick = (deal: Deal) => {
    console.log('🎯 Deal clicked:', { dealId: deal.id, dealTitle: deal.title });
    setFeaturedDeal(deal);
  };

  const handleGetDeal = (deal: Deal) => {
    console.log('🎫 Get deal clicked:', { dealId: deal.id, dealTitle: deal.title });
    setSelectedDeal(deal);
  };

  useEffect(() => {
    if (deals.length > 0 && !featuredDeal) {
      setFeaturedDeal(deals[0]);
    } else if (deals.length === 0) {
      setFeaturedDeal(null);
    }
  }, [deals, featuredDeal]);

  useEffect(() => {
    console.log('⭐ Featured deal changed:', featuredDeal ? { id: featuredDeal.id, title: featuredDeal.title } : null);
  }, [featuredDeal]);

  useEffect(() => {
    console.log('✅ Selected deal changed:', selectedDeal ? { id: selectedDeal.id, title: selectedDeal.title } : null);
  }, [selectedDeal]);


  useEffect(() => {
    if (!featuredDeal) return;

    const scrollContainer = scrollContainerRef.current;
    const dealElement = dealRefs.current[featuredDeal.id];

    if (scrollContainer && dealElement) {
      const containerWidth = scrollContainer.clientWidth;
      const dealLeft = dealElement.offsetLeft;
      const dealWidth = dealElement.offsetWidth;
      const scrollTo = dealLeft - (containerWidth / 2) + (dealWidth / 2);

      scrollContainer.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  }, [featuredDeal]);

  useEffect(() => {
    if (!isAutoplaying) return;

    autoplayTimerRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [images.length, isAutoplaying]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoplaying(false);

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
    if (isRightSwipe) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }

    setTouchStart(0);
    setTouchEnd(0);

    pauseTimerRef.current = setTimeout(() => {
      setIsAutoplaying(true);
    }, 5000);
  };

  const loadReviews = useCallback(async () => {
    console.log('🔍 loadReviews() called');
    setIsLoadingReviews(true);
    try {
      // Use parent merchant ID for reviews if available (for branches)
      const reviewTargetId = restaurant.parentMerchantId || restaurant.id;
      console.log('🔍 Loading reviews for:', {
        displayId: restaurant.id,
        displayName: restaurant.name,
        reviewTargetId: reviewTargetId,
        parentMerchantId: restaurant.parentMerchantId,
        isParent: !restaurant.parentMerchantId || restaurant.parentMerchantId === restaurant.id,
        reviewCount: restaurant.reviewCount,
        usingEdge: isFeatureEnabled('USE_EDGE_REVIEWS')
      });

      const reviewsData = isFeatureEnabled('USE_EDGE_REVIEWS')
        ? await reviewsEdgeAPI.getMerchantReviews(reviewTargetId)
        : await reviewsAPI.getReviews('merchant', reviewTargetId);

      console.log('✅ Reviews API response:', {
        count: reviewsData?.length || 0,
        dataType: Array.isArray(reviewsData) ? 'array' : typeof reviewsData,
        firstReview: reviewsData?.[0] || null,
        reviews: reviewsData
      });

      // Ensure we always set an array
      if (Array.isArray(reviewsData)) {
        setReviews(reviewsData as any);
        console.log('✅ Reviews state updated with', reviewsData.length, 'reviews');
      } else {
        console.warn('⚠️  Reviews data is not an array:', reviewsData);
        setReviews([]);
      }
    } catch (error) {
      console.error('❌ Failed to load reviews:', error);
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
      console.log('✅ Loading complete');
    }
  }, [restaurant.id, restaurant.parentMerchantId, restaurant.name, restaurant.reviewCount]);

  const loadMenu = async () => {
    setIsLoadingMenu(true);
    try {
      const menuData = await menuItemsAPI.getMenuItems(restaurant.id);
      setMenuItems(menuData);
    } catch (error) {
      console.error('Failed to load menu:', error);
      setMenuItems([]);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'menu') {
      loadMenu();
    }
  }, [activeTab, restaurant.id]);

  useEffect(() => {
    console.log('🔄 Reviews tab effect triggered:', { activeTab, restaurantId: restaurant.id });
    if (activeTab === 'reviews') {
      console.log('▶️  Active tab is reviews, calling loadReviews()');
      loadReviews();
    }
  }, [activeTab, restaurant.id, loadReviews]);

  useEffect(() => {
    checkLikedStatus();
  }, [restaurant.id]);

  const checkLikedStatus = async () => {
    try {
      const merchantIdToCheck = restaurant.parentMerchantId || restaurant.id;

      console.log('💝 Checking liked status for merchant:', {
        id: restaurant.id,
        parentMerchantId: restaurant.parentMerchantId,
        merchantIdToCheck,
        name: restaurant.name
      });

      if (isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) {
        const likedMerchants = await likedMerchantsEdgeAPI.getLikedMerchants();
        console.log('💝 Total liked merchants:', likedMerchants.length);

        if (likedMerchants.length > 0) {
          console.log('💝 First liked merchant sample:', {
            id: likedMerchants[0].id,
            merchantId: (likedMerchants[0] as any).merchantId,
            name: (likedMerchants[0] as any).companyName
          });
        }

        console.log('💝 Looking for merchant ID:', merchantIdToCheck);
        const liked = likedMerchants.some(m => {
          const matches = m.id === merchantIdToCheck || (m as any).merchantId === merchantIdToCheck;
          if (matches) {
            console.log('💝 Match found:', { merchantId: m.id, checkingFor: merchantIdToCheck });
          }
          return matches;
        });

        console.log('💝 Final liked status:', liked);
        setIsFavorite(liked);
      } else {
        const liked = await likedMerchantsAPI.isLiked(merchantIdToCheck);
        setIsFavorite(liked);
      }
    } catch (error) {
      console.error('❌ Failed to check liked status:', error);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (isLoadingLiked) {
      console.log('⏳ Like request already in progress, skipping...');
      return;
    }

    const previousState = isFavorite;
    const newState = !previousState;

    const merchantIdToUse = restaurant.parentMerchantId || restaurant.id;

    console.log('❤️ Toggling favorite for merchant:', {
      id: restaurant.id,
      parentMerchantId: restaurant.parentMerchantId,
      merchantIdToUse,
      name: restaurant.name,
      currentState: previousState ? 'LIKED' : 'NOT LIKED',
      willBe: newState ? 'LIKED' : 'NOT LIKED'
    });

    setIsFavorite(newState);
    setIsLoadingLiked(true);

    try {
      if (isFeatureEnabled('USE_EDGE_LIKED_MERCHANTS')) {
        if (previousState) {
          console.log('💔 Calling UNLIKE API for merchant:', merchantIdToUse);
          const result = await likedMerchantsEdgeAPI.unlikeMerchant(merchantIdToUse);
          console.log('✅ Unlike API response:', result);
        } else {
          console.log('💖 Calling LIKE API for merchant:', merchantIdToUse);
          const result = await likedMerchantsEdgeAPI.likeMerchant(merchantIdToUse);
          console.log('✅ Like API response:', result);
        }
      } else {
        if (previousState) {
          await likedMerchantsAPI.removeLikedMerchant(merchantIdToUse);
        } else {
          await likedMerchantsAPI.addLikedMerchant(merchantIdToUse);
        }
      }

      console.log('✅ Successfully toggled favorite. New state:', newState ? 'LIKED' : 'NOT LIKED');
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', {
        merchantId: restaurant.id,
        merchantIdToUse,
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      setIsFavorite(previousState);
      console.log('🔄 Reverted state to:', previousState ? 'LIKED' : 'NOT LIKED');

      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to ${previousState ? 'unlike' : 'like'} merchant: ${errorMessage}`);
    } finally {
      setIsLoadingLiked(false);
    }
  };

  const handleShare = async () => {
    const specialtyText = merchantData.specialty && merchantData.specialty.length > 0
      ? ` - ${merchantData.specialty.join(', ')}`
      : '';
    const shareData = {
      title: restaurant.name,
      text: `Check out ${restaurant.name}${specialtyText}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        console.log('✅ Shared successfully');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('❌ Failed to share:', error);
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        } catch (clipboardError) {
          console.error('❌ Failed to copy to clipboard:', clipboardError);
        }
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="w-full max-w-md mx-auto pb-4">
          <div
            className="relative h-80 bg-gray-200"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[currentImageIndex]}
              alt={restaurant.name}
              className="w-full h-full object-cover object-center transition-opacity duration-300"
              loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={currentImageIndex === 0 ? 'high' : 'auto'}
              decoding="async"
              onError={(e) => {
                console.error('❌ Image failed to load:', images[currentImageIndex]);
                console.error('Image element:', e.currentTarget);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', images[currentImageIndex]);
              }}
            />

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <div className="flex gap-2">
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

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentImageIndex ? 'bg-slate-800 w-8' : 'bg-white/60 w-2'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="px-5 pt-5">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{merchantData.name}</h1>

            <div className="flex items-center gap-2 text-sm mb-1">
              {merchantData.subcategoryName && (
                <span className="font-bold text-slate-800 truncate" style={{ minWidth: 0 }}>
                  {merchantData.subcategoryName}
                </span>
              )}
              <span className="text-gray-600 flex-shrink-0">
                <span className="font-semibold text-slate-800">City: </span>
                {merchantData.city}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                currentlyOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {currentlyOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {merchantData.occupiedSlots > 0 && (
              <div className="text-orange-600 flex items-center gap-0.5 text-sm mb-5">
                <span className="leading-none">⚡</span>
                <span className="font-medium leading-none">{merchantData.occupiedSlots} PB Available</span>
              </div>
            )}

            {!merchantData.occupiedSlots && <div className="mb-5"></div>}

            {deals.length > 0 && (
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">Select a deal:</h2>
                <div
                  ref={scrollContainerRef}
                  className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide scroll-smooth"
                  style={{
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {deals.map((deal, index) => {
                    const bgColors = ['#E4F5FE', '#FFE8DC', '#D9F8EF'];
                    const bgColor = bgColors[index % bgColors.length];
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        ref={(el) => (dealRefs.current[deal.id] = el)}
                        onClick={() => handleDealClick(deal)}
                        className="flex-shrink-0 w-36 rounded-lg overflow-hidden relative cursor-pointer active:scale-95 transition-transform select-none"
                        style={{
                          backgroundColor: bgColor,
                          touchAction: 'manipulation'
                        }}
                      >
                        <div className="relative pointer-events-none">
                          <img
                            src={deal.image}
                            alt={deal.title}
                            className="w-full h-24 object-cover"
                            loading={index < 3 ? 'eager' : 'lazy'}
                            decoding="async"
                            draggable="false"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (!img.src.includes('pexels.com') && !img.src.includes('unsplash.com')) {
                                img.src = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop';
                              }
                            }}
                          />
                          {featuredDeal?.id === deal.id && (
                            <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                              Selected
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 text-left pointer-events-none">
                          <p className="text-xs font-semibold mb-1 line-clamp-2" style={{ color: '#203F55' }}>{deal.title}</p>
                          {deal.averagePrice > 0 && (
                            <p className="text-[10px]" style={{ color: '#203F55' }}>Average price: €{deal.averagePrice}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {deals.length > 0 && featuredDeal && (
              <div className="bg-cyan-50 rounded-2xl p-4 mb-5 relative">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900 flex-1 pr-2">
                    {featuredDeal.title}
                  </h3>
                  <button
                    onClick={() => setShowDealNote(true)}
                    className="w-7 h-7 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-cyan-200 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-cyan-700" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3 text-xs">
                  {featuredDeal.savings && (
                    <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                      <span className="font-medium"><span className="text-sm">€</span>{featuredDeal.savings} Saving</span>
                    </div>
                  )}
                  {featuredDeal.duration && (
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20.924 5.617a1 1 0 0 0-.217-.324l-3-3a1 1 0 1 0-1.414 1.414L17.586 5H8a5 5 0 0 0-5 5v2a1 1 0 1 0 2 0v-2a3 3 0 0 1 3-3h9.586l-1.293 1.293a1 1 0 0 0 1.414 1.414l3-3A1 1 0 0 0 21 6m-.076-.383a1 1 0 0 1 .076.38zm-17.848 12a1 1 0 0 0 .217 1.09l3 3a1 1 0 0 0 1.414-1.414L6.414 19H16a5 5 0 0 0 5-5v-2a1 1 0 1 0-2 0v2a3 3 0 0 1-3 3H6.414l1.293-1.293a1 1 0 1 0-1.414-1.414l-3 3m-.217.324a1 1 0 0 1 .215-.322z"/></svg>
                      <span className="font-medium">{featuredDeal.duration} days</span>
                    </div>
                  )}
                  {featuredDeal.isOnsite && (
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="font-medium">On-site</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                  {featuredDeal.description}
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGetDeal(featuredDeal);
                  }}
                  className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-3.5 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-md cursor-pointer active:scale-98"
                >
                  Get this deal
                </button>
              </div>
            )}

            <div className="border-b border-gray-200 mb-5">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 pb-3 font-bold text-sm transition-colors relative ${
                    activeTab === 'about' ? 'text-slate-900' : 'text-gray-400'
                  }`}
                >
                  About
                  {activeTab === 'about' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`flex-1 pb-3 font-bold text-sm transition-colors relative ${
                    activeTab === 'menu' ? 'text-slate-900' : 'text-gray-400'
                  }`}
                >
                  Menu
                  {activeTab === 'menu' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 pb-3 font-bold text-sm transition-colors relative ${
                    activeTab === 'reviews' ? 'text-slate-900' : 'text-gray-400'
                  }`}
                >
                  Reviews
                  {activeTab === 'reviews' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t" />
                  )}
                </button>
              </div>
            </div>

            {activeTab === 'about' && (
              <div>
                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-900 mb-2">Specialty:</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {merchantData.specialty && merchantData.specialty.length > 0
                      ? merchantData.specialty.join(', ')
                      : 'No specialty information available'}
                  </p>
                </div>

                {merchantData.reviewCount > 0 && (
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-slate-900 mb-2">Ratings & reviews</h3>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                      <span className="text-sm text-slate-700">
                        {merchantData.rating.toFixed(1)} average | {merchantData.reviewCount} {merchantData.reviewCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Location:</h3>
                  <button
                    onClick={() => {
                      let googleMapsUrl;
                      if (restaurant.latitude && restaurant.longitude) {
                        googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;
                      } else {
                        const address = encodeURIComponent(restaurant.address || restaurant.name);
                        googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
                      }
                      window.open(googleMapsUrl, '_blank');
                    }}
                    className="w-full"
                  >
                    <div className="relative h-48 bg-gray-200 rounded-2xl overflow-hidden group hover:bg-gray-300 transition-all">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                        <rect width="400" height="300" fill="#e5e5e5"/>

                        <path d="M20 80 Q80 60 120 100 L180 140 L220 100 Q260 80 320 120" stroke="#d4d4d4" strokeWidth="8" fill="none" strokeLinecap="round"/>
                        <path d="M10 160 Q50 140 100 180 L140 200 Q180 220 240 180 L300 160 L380 200" stroke="#d4d4d4" strokeWidth="8" fill="none" strokeLinecap="round"/>
                        <path d="M30 250 L100 220 Q140 200 180 240 L260 270" stroke="#d4d4d4" strokeWidth="8" fill="none" strokeLinecap="round"/>

                        <path d="M50 40 Q80 30 100 60 L120 90" stroke="#d4d4d4" strokeWidth="5" fill="none" strokeLinecap="round"/>
                        <path d="M280 60 Q300 80 320 60 L340 40" stroke="#d4d4d4" strokeWidth="5" fill="none" strokeLinecap="round"/>
                        <path d="M360 180 Q370 200 390 180" stroke="#d4d4d4" strokeWidth="5" fill="none" strokeLinecap="round"/>

                        <text x="30" y="95" fill="#9ca3af" fontSize="8" fontFamily="Arial" transform="rotate(-15 30 95)">Park Ave</text>
                        <text x="260" y="110" fill="#9ca3af" fontSize="8" fontFamily="Arial" transform="rotate(20 260 110)">Main St</text>
                        <text x="150" y="195" fill="#9ca3af" fontSize="8" fontFamily="Arial" transform="rotate(-10 150 195)">Oak Road</text>
                        <text x="80" y="240" fill="#9ca3af" fontSize="8" fontFamily="Arial">Central Ave</text>
                        <text x="300" y="70" fill="#9ca3af" fontSize="7" fontFamily="Arial">Hill Dr</text>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 mb-2 flex items-center justify-center">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335"/>
                          </svg>
                        </div>
                        <p className="font-semibold text-[#0f172a]">Click to view on map</p>
                        <p className="text-sm text-[#0F152A] opacity-75">{restaurant.address || restaurant.name}</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Open hours</h3>
                  <div className="space-y-2.5">
                    {openingHours.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-slate-900 font-medium">{item.day}</span>
                        <span className="text-sm text-slate-600">{item.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="py-3">
                {isLoadingMenu ? (
                  <div className="py-12 text-center text-gray-500">
                    <p>Loading menu...</p>
                  </div>
                ) : menuItems.length > 0 ? (
                  <div className="space-y-4">
                    {['appetizer', 'main', 'dessert', 'drink', 'other'].map(category => {
                      const categoryItems = menuItems.filter(item => item.category === category);
                      if (categoryItems.length === 0) return null;

                      const categoryNames: { [key: string]: string } = {
                        appetizer: 'Appetizers',
                        main: 'Main Dishes',
                        dessert: 'Desserts',
                        drink: 'Drinks',
                        other: 'Other'
                      };

                      return (
                        <div key={category}>
                          <h3 className="text-base font-bold text-slate-900 mb-2 px-6 capitalize">
                            {categoryNames[category]}
                          </h3>
                          <div className="space-y-1">
                            {categoryItems.map(item => (
                              <div key={item.id} className="px-6 py-2 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900">{item.name}</h4>
                                    {item.description && (
                                      <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                                    )}
                                    {!item.isAvailable && (
                                      <span className="inline-block mt-0.5 text-xs text-red-600 font-medium">
                                        Currently unavailable
                                      </span>
                                    )}
                                  </div>
                                  <div className="ml-3 text-right flex-shrink-0">
                                    <span className="font-bold text-slate-900">
                                      €{item.price.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <p>No menu items available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length > 0 && (
                  <div className="flex items-center justify-between pb-3">
                    <h3 className="text-base font-semibold text-gray-900">Ratings & Reviews</h3>
                    <span className="text-sm text-gray-500">{merchantData.reviewCount} ratings</span>
                  </div>
                )}

                {isLoadingReviews ? (
                  <div className="py-12 text-center text-gray-500">
                    <p>Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <p className="text-gray-400">No reviews yet</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-6 pb-4">
                      <div className="flex flex-col items-center">
                        <span className="text-5xl font-bold text-gray-900 mb-1">
                          {merchantData.rating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(merchantData.rating)
                                  ? 'fill-orange-500 text-orange-500'
                                  : 'fill-gray-300 text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = reviews.filter(r => Math.round(r.rating) === rating).length;
                          const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm text-gray-700 w-2">{rating}</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      {reviews.map((review: any) => {
                        const userName = review.userName || review.user_name || 'Anonymous';
                        const initial = userName.charAt(0).toUpperCase();
                        const createdAt = review.createdAt || review.created_at;

                        return (
                          <div key={review.id} className="border-b border-gray-200 pb-3">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg font-semibold text-gray-700">{initial}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-gray-900">{userName}</h4>
                                  <span className="text-sm text-gray-400">
                                    {createdAt ? formatDate(createdAt) : 'Date unavailable'}
                                  </span>
                                </div>
                                {review.comment && (
                                  <p className="text-gray-600 text-sm leading-relaxed mb-1.5">{review.comment}</p>
                                )}
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating
                                          ? 'fill-orange-500 text-orange-500'
                                          : 'fill-gray-300 text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDeal && (
        <DealBookingModal
          deal={selectedDeal}
          restaurant={restaurant}
          onClose={() => setSelectedDeal(null)}
          onBookingComplete={onBookingComplete}
        />
      )}

      {showReviewForm && (
        <ReviewForm
          targetType="merchant"
          targetId={restaurant.id}
          targetName={restaurant.name}
          onClose={() => setShowReviewForm(false)}
          onSuccess={loadReviews}
        />
      )}

      {showDealNote && (
        <DealNoteModal onClose={() => setShowDealNote(false)} />
      )}
    </div>
  );
}
