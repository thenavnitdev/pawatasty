import { useState, useEffect, useCallback, useRef } from 'react';
import { Booking, Restaurant } from './types';
import { merchantsAPI, apiClient, authAPI, bookingsEdgeAPI, connectionInvitesAPI } from './services/mobile';
import { merchantsEdgeAPI } from './services/mobile/merchantsEdge';
import { profileEdgeAPI } from './services/mobile/profileEdge';
import { isFeatureEnabled } from './services/apiConfig';
import { supabase } from './lib/supabase';
import { getMerchantCoverUrl, getDealImageUrl } from './utils/imageUtils';
import { extractCityFromAddress } from './utils/addressUtils';
import { getCachedCities } from './utils/citiesCache';
import { LocationProvider } from './utils/LocationContext';
import { isBusinessOpen } from './utils/mapMarkers';
import { preloadMerchantImages } from './utils/imagePreloader';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login';
import OTPVerification from './components/OTPVerification';
import MapView from './components/MapView';
import BookingForm from './components/BookingForm';
import BookingConfirmation from './components/BookingConfirmation';
import BookingDetails from './components/BookingDetails';
import BookingsContainer from './components/BookingsContainer';
import SupportChat from './components/SupportChat';
import Menu from './components/Menu';
import Promotions from './components/Promotions';
import MembershipPlans from './components/MembershipPlans';
import DiscoverView from './components/DiscoverView';
import History from './components/History';
import HelpCenter from './components/HelpCenter';
import Settings from './components/Settings';
import PersonalInformation from './components/PersonalInformation';
import ProfileCompletion from './components/ProfileCompletion';
import MerchantDetails from './components/MerchantDetails';
import LinkIdModal from './components/LinkIdModal';
import ConnectionInvitesModal from './components/ConnectionInvitesModal';
import FriendsListModal from './components/FriendsListModal';

type View = 'splash' | 'login' | 'otp-verification' | 'profile-completion' | 'map' | 'booking-form' | 'confirmation' | 'bookings' | 'booking-detail' | 'chat' | 'promotions' | 'membership' | 'discover' | 'history' | 'help-center' | 'settings' | 'profile' | 'merchant-details';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('splash');
  const [previousView, setPreviousView] = useState<View>('map');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLinkIdModal, setShowLinkIdModal] = useState(false);
  const [showConnectionInvitesModal, setShowConnectionInvitesModal] = useState(false);
  const [showFriendsListModal, setShowFriendsListModal] = useState(false);
  const [connectionInvitesCount, setConnectionInvitesCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [splashComplete, setSplashComplete] = useState(false);
  const [bookingsInitialView, setBookingsInitialView] = useState<'list' | 'week' | 'invites' | 'liked'>('week');
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [unreadInvitesCount, setUnreadInvitesCount] = useState(0);

  // Prevent multiple simultaneous calls
  const isCheckingUser = useRef(false);
  const merchantsLoadedRef = useRef(false);

  // Load merchants (public data, no auth required)
  const loadMerchants = useCallback(async () => {
    if (merchantsLoadedRef.current) {
      console.log('Merchants already loaded, skipping');
      return;
    }

    try {
      console.log('🔄 Loading merchants...');
      const merchantsData = isFeatureEnabled('USE_EDGE_MERCHANTS')
        ? await merchantsEdgeAPI.getAllMerchants()
        : await merchantsAPI.getAllMerchants();

      console.log('✅ Merchants fetched:', merchantsData.length, 'merchants');

      const formattedRestaurants = merchantsData.map((merchant: any) => {
        const specialtyData = merchant.specialty || merchant.companySpecialty || [];

        console.log('🏪 Merchant mapping:', {
          id: merchant.id,
          name: merchant.name,
          businessType: merchant.businessType,
          merchantCategory: merchant.merchantCategory,
          dealsCount: merchant.deals?.length || 0,
          companySpecialty: merchant.companySpecialty,
          specialty: merchant.specialty,
          specialtyData: specialtyData,
        });

        const isOpen = isBusinessOpen(merchant.openTime, merchant.openDays);

        return {
          id: merchant.id,
          name: merchant.name,
          address: merchant.address,
          city: extractCityFromAddress(merchant.address || '', merchant.city),
          category: merchant.category,
          merchantCategory: merchant.merchantCategory,
          businessType: merchant.businessType,
          subcategoryName: merchant.subcategoryName,
          specialty: specialtyData,
          status: isOpen ? 'Open' : 'Closed',
          image_url: merchant.imageUrl,
          logoId: merchant.logoId,
          coverImageIds: merchant.coverImageIds,
          latitude: merchant.latitude,
          longitude: merchant.longitude,
          rating: merchant.rating || 0,
          reviewCount: merchant.reviewCount || 0,
          phone: merchant.phone,
          website: merchant.website,
          opening_hours: merchant.openingHours || '',
          open_days: merchant.openDays,
          open_time: merchant.openTime,
          deals: merchant.deals || [], // ✅ INCLUDE DEALS!
          availableSlots: merchant.availableSlots || 0,
          occupiedSlots: merchant.occupiedSlots || 0,
          totalSlots: merchant.totalSlots || 0,
          returnSlots: merchant.returnSlots || 0,
          hasStation: merchant.hasStation || false,
          unitPrice: merchant.unitPrice,
          unitMin: merchant.unitMin,
          parentMerchantId: merchant.parentMerchantId,
        };
      });

      console.log('✅ Setting restaurants state:', formattedRestaurants.length, 'items');
      setRestaurants(formattedRestaurants);
      merchantsLoadedRef.current = true;

      // Preload images for first 10 merchants in parallel
      const merchantsToPreload = formattedRestaurants.slice(0, 10).map(r => ({
        coverImageIds: r.coverImageIds || undefined,
        logoId: r.logoId || undefined,
      }));
      preloadMerchantImages(merchantsToPreload, 10);
      console.log('🖼️ Preloading images for first 10 merchants');

      getCachedCities().then(() => {
        console.log('📦 Cities data preloaded and cached');
      }).catch(err => {
        console.error('Error preloading cities:', err);
      });
    } catch (error) {
      console.error('❌ Error loading merchants:', error);
      setRestaurants([]);
    }
  }, []);

  // Load user-specific data (requires userId)
  const loadData = useCallback(async (userId: string, setView: boolean = false) => {
    try {
      const response = await bookingsEdgeAPI.getUserBookings();
      // Filter out completed, cancelled, and expired bookings - they only appear in History
      const formattedBookings = response.bookings
        .filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'expired')
        .map(b => ({
          id: b.id,
          user_id: b.userId,
          restaurant_id: b.merchantId,
          booking_date: b.bookingDate || b.booking_date || '',
          booking_time: b.booking_time || '',
          party_size: b.guests || 1,
          booking_type: (b.booking_type || 'single') as 'single' | 'group',
          status: b.status as 'reserved' | 'confirmed' | 'cancelled' | 'completed' | 'expired',
          created_at: b.createdAt || new Date().toISOString(),
          dealImage: b.dealImage || b.deal?.image || '',
          deal_description: b.deal?.title || '',
          restaurant: b.restaurant ? {
            id: b.restaurant.id,
            name: b.restaurant.name,
            address: b.restaurant.address,
            category: 'Restaurant' as any,
          } : undefined,
        }));
      setBookings(formattedBookings as Booking[]);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    }

    if (setView) {
      setCurrentView('map');
    }
  }, []);

  const loadConnectionInvitesCount = useCallback(async () => {
    try {
      const [invitesResult, connectionsResult] = await Promise.all([
        connectionInvitesAPI.getPendingInvites(),
        connectionInvitesAPI.getConnections()
      ]);

      if (invitesResult.success) {
        setConnectionInvitesCount(invitesResult.invites.length);
        console.log('✅ Connection invites count loaded:', invitesResult.invites.length);
      }

      if (connectionsResult.success) {
        setConnectionsCount(connectionsResult.connections.length);
        console.log('✅ Connections count loaded:', connectionsResult.connections.length);
      }
    } catch (error) {
      console.error('Error loading connection counts:', error);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('users')
        .select('full_name, current_level, email, phone_nr, profile_completed, total_savings, available_points, total_points, pending_points, profile_picture, link_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        console.log('✅ User profile refreshed:', profileData);
        setUserProfile(profileData);

        // Load connection invites count
        await loadConnectionInvitesCount();
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [user, loadConnectionInvitesCount]);

  const checkProfileCompletion = useCallback(async (currentUser: any) => {
    try {
      console.log('Checking profile completion for user:', currentUser.id);
      console.log('User metadata:', currentUser);

      // Load user profile from database FIRST (this is the source of truth)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('full_name, current_level, email, phone_nr, profile_completed, total_savings, available_points, total_points, pending_points, profile_picture, link_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        // If user doesn't exist in database, they need to complete profile
        setCurrentView('profile-completion');
        return;
      }

      if (profileData) {
        console.log('✅ User profile loaded from database:', profileData);
        setUserProfile(profileData);

        // Load connection invites count
        await loadConnectionInvitesCount();

        // Check if profile is complete based on database flag
        if (profileData.profile_completed === true) {
          console.log('✅ Profile is complete (profile_completed = true), showing map');
          // Load user-specific data (bookings, etc)
          await loadData(currentUser.id, false);
          setCurrentView('map');
          return;
        } else {
          console.log('❌ Profile incomplete (profile_completed = false), showing profile completion');
          setCurrentView('profile-completion');
          return;
        }
      } else {
        // No profile data found - need to complete profile
        console.log('❌ No profile data found, showing profile completion');
        setCurrentView('profile-completion');
      }
    } catch (err) {
      console.error('Error checking profile:', err);
      // On error, show profile completion to be safe
      setCurrentView('profile-completion');
    }
  }, [loadData, loadConnectionInvitesCount]);

  const checkUser = useCallback(async () => {
    if (isCheckingUser.current) {
      console.log('checkUser already running, skipping');
      return;
    }

    isCheckingUser.current = true;
    console.log('Starting checkUser...');

    try {
      // Check for mobile deep link OAuth callback (pawatasty://auth/callback?code=...)
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');

      if (authCode) {
        console.log('🔑 Detected OAuth code from deep link, exchanging for session...');
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

          if (error) {
            console.error('❌ Failed to exchange code for session:', error);
            setCurrentView('login');
            return;
          }

          if (data?.session?.user) {
            console.log('✅ Successfully exchanged code for session:', data.session.user.id);
            setUser(data.session.user);
            localStorage.setItem('supabase_token', data.session.access_token);
            localStorage.setItem('supabase_user', JSON.stringify(data.session.user));

            window.history.replaceState({}, document.title, window.location.pathname);

            await checkProfileCompletion(data.session.user);
            return;
          }
        } catch (err) {
          console.error('❌ Error during code exchange:', err);
          setCurrentView('login');
          return;
        }
      }

      // Check for iDEAL/Bancontact payment setup return
      const paymentMethodId = urlParams.get('payment_setup_complete');
      const setupIntentId = urlParams.get('setup_intent');
      const setupIntentClientSecret = urlParams.get('setup_intent_client_secret');

      if (paymentMethodId && (setupIntentId || setupIntentClientSecret)) {
        console.log('💳 Detected iDEAL/Bancontact return, completing setup...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Import dynamically to avoid circular dependencies
            const { paymentMethodsAPI } = await import('./services/mobile');

            await paymentMethodsAPI.completePaymentMethodSetup(
              paymentMethodId,
              setupIntentId || setupIntentClientSecret || ''
            );

            console.log('✅ Payment method setup completed successfully');

            // Clean URL and show success
            window.history.replaceState({}, document.title, window.location.pathname);

            // Continue to check user state
          }
        } catch (err) {
          console.error('❌ Error completing payment setup:', err);
          // Continue anyway - user can retry from payment methods
        }
      }

      // Check for web OAuth callback (URL contains auth fragments)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasAuthCallback = hashParams.has('access_token') || hashParams.has('error');

      if (hasAuthCallback) {
        console.log('🔄 Detected OAuth callback, waiting for session...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check Supabase session (handles phone, email, and OAuth)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
      }

      if (session?.user) {
        console.log('✅ Found active Supabase session:', session.user.id);
        setUser(session.user);
        await checkProfileCompletion(session.user);
        return;
      }

      // Fallback: Check for legacy phone auth session
      const phoneAuthSession = localStorage.getItem('phone_auth_session');
      const phoneAuthUser = localStorage.getItem('phone_auth_user');

      if (phoneAuthSession && phoneAuthUser) {
        console.log('⚠️ Found legacy phone auth session - migrating to Supabase Auth');
        const user = JSON.parse(phoneAuthUser);
        setUser(user);
        await checkProfileCompletion(user);
        return;
      }

      // Fallback: Check for legacy API token
      const savedToken = localStorage.getItem('api_token');
      const savedUserData = localStorage.getItem('user_data');

      if (savedToken && savedUserData) {
        try {
          console.log('⚠️ Found legacy API token - please re-authenticate');
          apiClient.setAuthToken(savedToken);
          const result = await authAPI.verify();

          if (result.valid && result.user) {
            console.log('✅ Verified with legacy API token');
            setUser(result.user);
            await checkProfileCompletion(result.user);
          } else {
            setCurrentView('login');
          }
        } catch (err) {
          console.error('Token verification failed:', err);
          localStorage.removeItem('api_token');
          localStorage.removeItem('user_data');
          setCurrentView('login');
        }
      } else {
        console.log('No session found, showing login');
        setCurrentView('login');
      }
    } finally {
      isCheckingUser.current = false;
      console.log('checkUser completed');
    }
  }, [checkProfileCompletion]);

  // Load merchants immediately after splash (before login)
  useEffect(() => {
    if (splashComplete) {
      console.log('🚀 Splash complete, starting data load...');
      loadMerchants();
      checkUser();
    }
  }, [splashComplete]);

  // Listen for auth state changes (logout, session expiry, OAuth/phone login)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, 'Current view:', currentView);

      // Ignore auth state changes if we're on profile completion screen
      // This prevents reload loops when email verification is triggered
      if (currentView === 'profile-completion') {
        console.log('Skipping auth state change - user is completing profile');
        return;
      }

      if (event === 'SIGNED_OUT') {
        // User logged out, clear state and redirect to login
        setUser(null);
        setUserProfile(null);
        setBookings([]);
        setRestaurants([]);
        merchantsLoadedRef.current = false;
        setSelectedBooking(null);
        setSelectedRestaurant(null);
        setIsMenuOpen(false);
        localStorage.removeItem('api_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_user');
        setCurrentView('login');
      } else if (event === 'SIGNED_IN' && session?.user) {
        // User signed in (Google, Facebook, or phone), update user and check profile
        console.log('✅ User signed in via', session.user.app_metadata.provider, ':', session.user.id);
        setUser(session.user);
        localStorage.setItem('supabase_token', session.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(session.user));

        // Reload merchants if they were cleared
        if (!merchantsLoadedRef.current) {
          console.log('🔄 Reloading merchants after sign in...');
          loadMerchants().catch(err => console.error('Failed to load merchants:', err));
        }

        // Use async block to avoid deadlock
        (async () => {
          try {
            await checkProfileCompletion(session.user);
          } catch (err) {
            console.error('Failed to check profile:', err);
          }
        })();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Session refreshed, update stored token
        console.log('Token refreshed, updating localStorage');
        localStorage.setItem('supabase_token', session.access_token);
      } else if (event === 'INITIAL_SESSION') {
        // Initial session detected, do nothing to avoid infinite loop
        console.log('Initial session detected, skipping state update');
      } else if (event === 'USER_UPDATED') {
        // User data updated (e.g., email change), ignore during profile completion
        console.log('User updated event, skipping to prevent loops');
      }
    });

    const handleNavigateToMembership = () => {
      console.log('📍 Navigate to membership event received');
      setCurrentView('membership');
      setIsMenuOpen(false);
    };

    window.addEventListener('navigate-to-membership', handleNavigateToMembership as EventListener);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('navigate-to-membership', handleNavigateToMembership as EventListener);
    };
  }, [checkProfileCompletion, loadMerchants, currentView]);

  // Listen for real-time profile updates (points, savings, etc.)
  useEffect(() => {
    if (!user) return;

    const profileSubscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('🔄 Profile updated, refreshing...');
          refreshUserProfile();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('🔄 Points transaction detected, refreshing profile...');
          refreshUserProfile();
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [user, refreshUserProfile]);

  // Listen for real-time connection invite updates
  useEffect(() => {
    if (!user) return;

    const invitesSubscription = supabase
      .channel('connection-invites-global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_invites',
          filter: `recipient_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 New connection invite received (global):', payload);
          // Increment the count immediately
          setConnectionInvitesCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_invites',
          filter: `recipient_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Connection invite updated (global):', payload);
          const updatedInvite = payload.new as any;
          // If invite is no longer pending, decrement count
          if (updatedInvite.status !== 'pending') {
            setConnectionInvitesCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      invitesSubscription.unsubscribe();
    };
  }, [user]);

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    console.log('🏪 App: handleRestaurantSelect called:', {
      name: restaurant.name,
      specialty: restaurant.specialty,
      id: restaurant.id,
    });
    setSelectedRestaurant(restaurant);
    setPreviousView(currentView); // Track where we came from (map or discover)
    setCurrentView('merchant-details');
  };

  const handleBookingComplete = async (bookingId: string) => {
    try {
      const response = await bookingsEdgeAPI.getUserBookings();
      // Filter out completed, cancelled, and expired bookings - they only appear in History
      const formattedBookings = response.bookings
        .filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'expired')
        .map(b => ({
          id: b.id,
          user_id: b.userId,
          restaurant_id: b.merchantId,
          booking_date: b.bookingDate || b.booking_date || '',
          booking_time: b.booking_time || '',
          party_size: b.guests || 1,
          booking_type: 'single' as const,
          status: b.status as 'reserved' | 'confirmed' | 'cancelled',
          created_at: b.createdAt || new Date().toISOString(),
          dealImage: b.dealImage || b.deal?.image || '',
          deal_description: b.deal?.title || '',
          restaurant: b.restaurant || b.merchant ? {
            id: b.merchantId,
            name: b.restaurant?.name || b.merchant?.name || 'Restaurant',
            address: b.restaurant?.address || b.merchant?.address || '',
            category: 'Restaurant' as any,
          } : undefined,
        }));
      setBookings(formattedBookings as Booking[]);
      setCurrentView('bookings');
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleLogin = () => {
    console.log('handleLogin called, calling checkUser...');
    checkUser();
  };

  const handleOTPRequired = (phoneNumber: string) => {
    setPendingPhoneNumber(phoneNumber);
    setCurrentView('otp-verification');
  };

  const handleOTPVerified = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      setCurrentView('profile-completion');
    }
  };

  const handleOTPBack = () => {
    setPendingPhoneNumber(null);
    setCurrentView('login');
  };

  const handleGoToBookings = async (initialView?: 'list' | 'week' | 'invites' | 'liked') => {
    // Save the current view, but ensure it's a main view (map or discover)
    const viewToSave = (currentView === 'map' || currentView === 'discover') ? currentView : 'map';
    console.log('Navigating to bookings, saving previous view:', viewToSave);
    setPreviousView(viewToSave);
    setBookingsInitialView(initialView || 'week');

    // Navigate immediately for instant feedback
    setCurrentView('bookings');

    // Refresh bookings in background
    try {
      const response = await bookingsEdgeAPI.getUserBookings();
      // Filter out completed, cancelled, and expired bookings - they only appear in History
      const formattedBookings = response.bookings
        .filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'expired')
        .map(b => ({
          id: b.id,
          user_id: b.userId,
          restaurant_id: b.merchantId,
          booking_date: b.bookingDate || b.booking_date || '',
          booking_time: b.booking_time || '',
          party_size: b.guests || 1,
          booking_type: b.booking_type || 'single' as const,
          status: b.status as 'reserved' | 'confirmed' | 'cancelled',
          created_at: b.createdAt || new Date().toISOString(),
          restaurant: b.restaurant || b.merchant ? {
            id: b.merchantId,
            name: b.restaurant?.name || b.merchant?.name || 'Restaurant',
            address: b.restaurant?.address || b.merchant?.address || '',
          } : undefined,
          deal_description: b.deal?.title || b.deal?.description || '',
          dealImage: b.deal?.image || b.dealImage || '',
        }));
      setBookings(formattedBookings as Booking[]);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const handleExploreMore = () => {
    setCurrentView('map');
  };

  const handleBookingClick = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setPreviousView(currentView);
      setCurrentView('booking-detail');
    }
  };

  const handleOpenChat = () => {
    setPreviousView(currentView);
    setCurrentView('chat');
  };

  const handleCloseChat = () => {
    setCurrentView('map');
  };

  const handleOpenPromotions = () => {
    setPreviousView(currentView);
    setIsMenuOpen(false);
    setCurrentView('promotions');
  };

  const handleOpenMembership = () => {
    setPreviousView(currentView);
    setIsMenuOpen(false);
    setCurrentView('membership');
  };

  const handleOpenDiscover = () => {
    setPreviousView(currentView);
    setCurrentView('discover');
  };

  const handleOpenHistory = () => {
    console.log('Opening history, current view:', currentView);
    setPreviousView(currentView);
    setIsMenuOpen(false);
    setCurrentView('history');
  };

  const handleOpenHelpCenter = () => {
    setPreviousView(currentView);
    setIsMenuOpen(false);
    setCurrentView('help-center');
  };

  const handleOpenSettings = () => {
    setPreviousView(currentView);
    setIsMenuOpen(false);
    setCurrentView('settings');
  };

  const handleOpenProfile = () => {
    setPreviousView(currentView);
    setIsMenuOpen(false);
    setCurrentView('profile');
  };

  const handleOpenLinkId = () => {
    setShowLinkIdModal(true);
  };

  const handleOpenConnectionInvites = () => {
    setShowConnectionInvitesModal(true);
  };

  const handleOpenFriendsList = () => {
    setShowFriendsListModal(true);
  };

  const handleBackFromMenuPage = () => {
    console.log('Navigating back from menu page to:', previousView);
    setCurrentView(previousView);
    // Only open menu if returning to map view
    if (previousView === 'map') {
      setIsMenuOpen(true);
    }
  };

  const handleSplashComplete = () => {
    setSplashComplete(true);
    setCurrentView('login');
  };

  if (currentView === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (currentView === 'login') {
    return <Login onLogin={handleLogin} onOTPRequired={handleOTPRequired} />;
  }

  if (currentView === 'otp-verification' && pendingPhoneNumber) {
    return (
      <OTPVerification
        phoneNumber={pendingPhoneNumber}
        onVerified={handleOTPVerified}
        onBack={handleOTPBack}
      />
    );
  }

  if (currentView === 'profile-completion' && user) {
    return (
      <ProfileCompletion
        user={user}
        prefilledPhone={pendingPhoneNumber || undefined}
        onBack={() => {
          setPendingPhoneNumber(null);
          setCurrentView('login');
        }}
        onComplete={async () => {
          setPendingPhoneNumber(null);
          try {
            const profile = await profileEdgeAPI.getProfile();
            const updatedUser = { ...user, ...profile };
            setUser(updatedUser);

            // Reload user profile for Menu display
            const { data: profileData } = await supabase
              .from('users')
              .select('full_name, current_level, email, phone_nr, total_savings, available_points, total_points, pending_points, profile_picture, link_id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (profileData) {
              console.log('✅ User profile reloaded after completion:', profileData);
              setUserProfile(profileData);
            }

            const savedToken = localStorage.getItem('api_token');
            if (savedToken) {
              localStorage.setItem('user_data', JSON.stringify(updatedUser));
            }
          } catch (err) {
            console.error('Error refreshing profile:', err);
          }

          await loadData(user.id, true);
          setCurrentView('map');
        }}
      />
    );
  }

  if (currentView === 'map') {
    console.log('🗺️ Rendering MapView with', restaurants.length, 'restaurants');
    return (
      <>
        <MapView
          restaurants={restaurants}
          onRestaurantSelect={handleRestaurantSelect}
          onNavigateToBookings={() => handleGoToBookings('week')}
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenDiscover={handleOpenDiscover}
          onOpenPromotions={handleOpenPromotions}
          unreadInvitesCount={unreadInvitesCount}
          userProfile={userProfile}
        />
        <Menu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onOpenPromotions={handleOpenPromotions}
          onOpenMembership={handleOpenMembership}
          onOpenHistory={handleOpenHistory}
          onOpenHelpCenter={handleOpenHelpCenter}
          onOpenSettings={handleOpenSettings}
          onOpenProfile={handleOpenProfile}
          onOpenLinkId={handleOpenLinkId}
          onOpenConnectionInvites={handleOpenConnectionInvites}
          onOpenFriendsList={handleOpenFriendsList}
          connectionInvitesCount={connectionInvitesCount}
          connectionsCount={connectionsCount}
          userProfile={userProfile}
        />
        {showLinkIdModal && (
          <LinkIdModal
            onClose={() => setShowLinkIdModal(false)}
            userLinkId={userProfile?.link_id}
          />
        )}
        {showConnectionInvitesModal && (
          <ConnectionInvitesModal
            isOpen={showConnectionInvitesModal}
            onClose={() => setShowConnectionInvitesModal(false)}
            onInviteCountChange={setConnectionInvitesCount}
            onConnectionsCountChange={setConnectionsCount}
          />
        )}
        {showFriendsListModal && (
          <FriendsListModal
            isOpen={showFriendsListModal}
            onClose={() => setShowFriendsListModal(false)}
            onConnectionsCountChange={setConnectionsCount}
          />
        )}
      </>
    );
  }

  if (currentView === 'discover') {
    console.log('🔍 Rendering DiscoverView with', restaurants.length, 'restaurants');
    return (
      <DiscoverView
        restaurants={restaurants}
        onRestaurantSelect={handleRestaurantSelect}
        onBack={() => setCurrentView('map')}
        onNavigateToBookings={() => handleGoToBookings('week')}
        unreadInvitesCount={unreadInvitesCount}
      />
    );
  }

  if (currentView === 'merchant-details' && selectedRestaurant) {
    const merchantData = {
      id: selectedRestaurant.id,
      name: selectedRestaurant.name,
      specialty: selectedRestaurant.specialty && selectedRestaurant.specialty.length > 0
        ? selectedRestaurant.specialty
        : [],
      subcategoryName: selectedRestaurant.subcategoryName,
      city: extractCityFromAddress(selectedRestaurant.address || '', selectedRestaurant.city),
      status: 'open',
      image: selectedRestaurant.image_url || '',
      address: selectedRestaurant.address || '',
      rating: selectedRestaurant.rating || 0,
      reviewCount: selectedRestaurant.reviewCount || 0,
      deals: selectedRestaurant.deals,
      latitude: selectedRestaurant.latitude,
      longitude: selectedRestaurant.longitude,
      coverImageIds: selectedRestaurant.coverImageIds || undefined,
      logoId: selectedRestaurant.logoId || undefined,
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
    };

    console.log('🏪 App: Passing merchantData to MerchantDetails:', {
      name: merchantData.name,
      specialty: merchantData.specialty,
      specialtyLength: merchantData.specialty?.length,
      subcategoryName: merchantData.subcategoryName,
      city: merchantData.city,
      reviewCount: merchantData.reviewCount,
    });

    return (
      <MerchantDetails
        restaurant={merchantData}
        onBack={() => setCurrentView(previousView)}
        onBookingComplete={async (bookingData) => {
          console.log('Deal booked:', bookingData);
          // Refresh bookings before navigating
          if (user) {
            try {
              const response = await bookingsEdgeAPI.getUserBookings();
              const formattedBookings = response.bookings
                .filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'expired')
                .map(b => ({
                  id: b.id,
                  user_id: b.userId,
                  restaurant_id: b.merchantId,
                  booking_date: b.bookingDate || b.booking_date || '',
                  booking_time: b.booking_time || '',
                  party_size: b.guests || 1,
                  booking_type: (b.booking_type || 'single') as 'single' | 'group',
                  status: b.status as 'reserved' | 'confirmed' | 'cancelled' | 'completed' | 'expired',
                  created_at: b.createdAt || new Date().toISOString(),
                  dealImage: b.dealImage || b.deal?.image || '',
                  deal_description: b.deal?.title || '',
                  restaurant: b.restaurant ? {
                    id: b.restaurant.id,
                    name: b.restaurant.name,
                    address: b.restaurant.address,
                    category: 'Restaurant' as any,
                  } : undefined,
                }));
              setBookings(formattedBookings as Booking[]);
              console.log('✅ Bookings refreshed, total:', formattedBookings.length);
            } catch (error) {
              console.error('Error refreshing bookings:', error);
            }
          }
          setCurrentView('bookings');
        }}
      />
    );
  }

  if (currentView === 'booking-form' && selectedRestaurant && user) {
    return (
      <BookingForm
        restaurant={selectedRestaurant}
        userId={user.id}
        onBack={() => setCurrentView('map')}
        onBookingComplete={handleBookingComplete}
      />
    );
  }

  if (currentView === 'confirmation' && selectedBooking && selectedBooking.restaurant) {
    return (
      <BookingConfirmation
        booking={selectedBooking}
        restaurant={selectedBooking.restaurant}
        onGoToBookings={handleGoToBookings}
        onExploreMore={handleExploreMore}
      />
    );
  }

  if (currentView === 'booking-detail' && selectedBooking) {
    // Find merchant details from the booking
    const merchant = restaurants.find(r => r.id === selectedBooking.restaurant_id);

    // Get deal image - prefer deal image from booking, fallback to merchant images
    const getImageUrl = () => {
      // First try to get the deal image from the booking data
      const bookingData = bookings.find(b => b.id === selectedBooking.id);
      if (bookingData && (bookingData as any).dealImage) {
        // dealImage contains the numeric file ID (e.g., "247")
        return getDealImageUrl((bookingData as any).dealImage);
      }

      // Fallback to merchant images
      if (merchant?.coverImageIds && merchant.coverImageIds.length > 0) {
        return getMerchantCoverUrl(merchant.coverImageIds[0]);
      }
      if (merchant?.logoId) {
        return getMerchantCoverUrl(merchant.logoId);
      }
      if (merchant?.image_url) {
        return getMerchantCoverUrl(merchant.image_url);
      }
      return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop';
    };

    // Get booking data with deal details
    const bookingData = bookings.find(b => b.id === selectedBooking.id);
    const dealTitle = bookingData?.deal_description || selectedBooking.deal_description || '';

    // Use restaurant data from booking (includes branch name) instead of looking up from merchants array
    const bookingRestaurant = selectedBooking.restaurant || bookingData?.restaurant;
    const merchantName = bookingRestaurant?.name || merchant?.name || 'Restaurant';
    const merchantAddress = bookingRestaurant?.address || merchant?.address || '';

    const handleBookingChanged = async () => {
      // Refresh user profile to update savings display
      await refreshUserProfile();
      // Refresh bookings to remove completed/cancelled/expired from active list
      if (user?.id) {
        try {
          const response = await bookingsEdgeAPI.getUserBookings();
          const formattedBookings = response.bookings
            .filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'expired')
            .map(b => ({
              id: b.id,
              user_id: b.userId,
              restaurant_id: b.merchantId,
              booking_date: b.bookingDate || b.booking_date || '',
              booking_time: b.booking_time || '',
              party_size: b.guests || 1,
              booking_type: 'single' as const,
              status: b.status as 'reserved' | 'confirmed' | 'cancelled' | 'completed' | 'expired',
              created_at: b.createdAt || new Date().toISOString(),
              dealImage: b.dealImage || b.deal?.image || '',
              deal_description: b.deal?.title || '',
              restaurant: b.restaurant || b.merchant ? {
                id: b.merchantId,
                name: b.restaurant?.name || b.merchant?.name || 'Restaurant',
                address: b.restaurant?.address || b.merchant?.address || '',
                category: 'Restaurant' as any,
              } : undefined,
            }));
          setBookings(formattedBookings as Booking[]);
        } catch (error) {
          console.error('Error refreshing bookings:', error);
        }
      }
    };

    return (
      <BookingDetails
        booking={{
          id: selectedBooking.id,
          type: 'dining' as const,
          name: merchantName,
          address: merchantAddress,
          date: selectedBooking.booking_date,
          time: selectedBooking.booking_time,
          status: selectedBooking.status === 'confirmed' ? 'active' : selectedBooking.status === 'cancelled' ? 'cancelled' : 'complete',
          amount: 0,
          deal: dealTitle,
          dealTitle: dealTitle,
          image: getImageUrl(),
          merchantId: selectedBooking.restaurant_id,
        }}
        onBack={() => {
          setSelectedBooking(null);
          setCurrentView(previousView);
        }}
        onNavigateToMap={() => {
          setSelectedBooking(null);
          setCurrentView(previousView);
        }}
        onBookingChanged={handleBookingChanged}
      />
    );
  }

  if (currentView === 'bookings') {
    return (
      <BookingsContainer
        bookings={bookings}
        initialView={bookingsInitialView}
        onBack={() => {
          // Always navigate back to map or discover (the main views)
          const targetView = (previousView === 'map' || previousView === 'discover') ? previousView : 'map';
          console.log('Bookings back button: navigating to', targetView);
          setCurrentView(targetView);
        }}
        onBookingClick={handleBookingClick}
        onOpenChat={handleOpenChat}
        onOpenHistory={handleOpenHistory}
        onRestaurantSelect={handleRestaurantSelect}
        onNavigateToDiscover={() => {
          console.log('Bottom nav: Discover clicked from bookings');
          setCurrentView('discover');
        }}
        onNavigateToMap={() => {
          console.log('Bottom nav: Map clicked from bookings');
          setCurrentView('map');
        }}
        onInviteCountChange={async (count) => {
          setConnectionInvitesCount(count);
          // Reload connections count to reflect accepted invites
          await loadConnectionInvitesCount();
        }}
      />
    );
  }

  if (currentView === 'chat' && user) {
    return <SupportChat onClose={() => setCurrentView(previousView)} onCloseToMap={() => setCurrentView('map')} />;
  }

  if (currentView === 'promotions') {
    return <Promotions onBack={handleBackFromMenuPage} />;
  }

  if (currentView === 'membership') {
    return <MembershipPlans onBack={handleBackFromMenuPage} userProfile={userProfile} />;
  }

  if (currentView === 'history') {
    return (
      <History
        onBack={() => {
          console.log('History back button clicked, returning to:', previousView);
          setCurrentView(previousView);
          if (previousView === 'map') {
            setIsMenuOpen(true);
          }
        }}
        onOpenHelpCenter={handleOpenHelpCenter}
        onNavigateToMerchant={(merchantId) => {
          const merchant = restaurants.find(r => r.id === merchantId);
          if (merchant) {
            handleRestaurantSelect(merchant);
          }
        }}
        onNavigateToMap={() => {
          setCurrentView('map');
        }}
      />
    );
  }

  if (currentView === 'help-center') {
    return <HelpCenter onBack={handleBackFromMenuPage} onNavigateToMap={() => setCurrentView('map')} />;
  }

  if (currentView === 'settings') {
    return <Settings onClose={handleBackFromMenuPage} onNavigateToMap={() => setCurrentView('map')} userProfile={userProfile} />;
  }

  if (currentView === 'profile') {
    return <PersonalInformation onClose={handleBackFromMenuPage} />;
  }

  return null;
}

function App() {
  return (
    <LocationProvider>
      <AppContent />
    </LocationProvider>
  );
}

export default App;
