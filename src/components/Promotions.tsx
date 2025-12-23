import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Gift, Share2, Loader2, Battery, Utensils, Users, X } from 'lucide-react';
import { promoCodesAPI, pointsAPI } from '../services/mobile';
import { promoCodesEdgeAPI } from '../services/mobile/promoCodesEdge';
import { pointsEdgeAPI } from '../services/mobile/pointsEdge';
import { isFeatureEnabled } from '../services/apiConfig';
import { supabase } from '../lib/supabase';
import EmptyPromoCodeModal from './EmptyPromoCodeModal';
import PromoCodeFailedModal from './PromoCodeFailedModal';
import PromoCodeSuccessModal from './PromoCodeSuccessModal';

// Cache configuration
const CACHE_KEYS = {
  REFERRAL_CODE: 'user_referral_code',
  POINTS_BALANCE: 'user_points_balance',
  TRANSACTIONS: 'user_transactions',
  USER_LEVEL: 'user_level_info',
};

const CACHE_EXPIRY = {
  REFERRAL_CODE: 30 * 24 * 60 * 60 * 1000, // 30 days
  POINTS_BALANCE: 5 * 60 * 1000, // 5 minutes
  TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
  USER_LEVEL: 10 * 60 * 1000, // 10 minutes
};

// In-memory cache for instant access
interface CacheData {
  referralCode: string | null;
  pointsBalance: number | null;
  transactions: PointsTransaction[] | null;
  userLevel: { level: number; name: string } | null;
}

const memoryCache: CacheData = {
  referralCode: null,
  pointsBalance: null,
  transactions: null,
  userLevel: null,
};

// Generic cache utilities
const getCachedData = <T,>(key: string, expiryMs: number): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < expiryMs) {
        console.log(`📦 Cache hit for ${key}`);
        return data;
      } else {
        console.log(`🗑️ Cache expired for ${key}`);
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn(`Error reading cache for ${key}:`, e);
  }
  return null;
};

const setCachedData = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
    console.log(`✅ Cached ${key}`);
  } catch (e) {
    console.warn(`Failed to cache ${key}:`, e);
  }
};

const clearCache = (key: string) => {
  localStorage.removeItem(key);
  console.log(`🗑️ Cleared cache for ${key}`);
};

// Specific cache getters/setters
const getCachedReferralCode = (): string | null => {
  if (memoryCache.referralCode) {
    return memoryCache.referralCode;
  }
  const cached = getCachedData<string>(CACHE_KEYS.REFERRAL_CODE, CACHE_EXPIRY.REFERRAL_CODE);
  if (cached) {
    memoryCache.referralCode = cached;
  }
  return cached;
};

const setCachedReferralCode = (code: string) => {
  memoryCache.referralCode = code;
  setCachedData(CACHE_KEYS.REFERRAL_CODE, code);
};

const getCachedPointsBalance = (): number | null => {
  if (memoryCache.pointsBalance !== null) {
    return memoryCache.pointsBalance;
  }
  const cached = getCachedData<number>(CACHE_KEYS.POINTS_BALANCE, CACHE_EXPIRY.POINTS_BALANCE);
  if (cached !== null) {
    memoryCache.pointsBalance = cached;
  }
  return cached;
};

const setCachedPointsBalance = (points: number) => {
  memoryCache.pointsBalance = points;
  setCachedData(CACHE_KEYS.POINTS_BALANCE, points);
};

const getCachedTransactions = (): PointsTransaction[] | null => {
  if (memoryCache.transactions) {
    return memoryCache.transactions;
  }
  const cached = getCachedData<PointsTransaction[]>(CACHE_KEYS.TRANSACTIONS, CACHE_EXPIRY.TRANSACTIONS);
  if (cached) {
    memoryCache.transactions = cached;
  }
  return cached;
};

const setCachedTransactions = (transactions: PointsTransaction[]) => {
  memoryCache.transactions = transactions;
  setCachedData(CACHE_KEYS.TRANSACTIONS, transactions);
};

const getCachedUserLevel = (): { level: number; name: string } | null => {
  if (memoryCache.userLevel) {
    return memoryCache.userLevel;
  }
  const cached = getCachedData<{ level: number; name: string }>(CACHE_KEYS.USER_LEVEL, CACHE_EXPIRY.USER_LEVEL);
  if (cached) {
    memoryCache.userLevel = cached;
  }
  return cached;
};

const setCachedUserLevel = (level: number, name: string) => {
  const data = { level, name };
  memoryCache.userLevel = data;
  setCachedData(CACHE_KEYS.USER_LEVEL, data);
};

const clearAllPromotionsCaches = () => {
  Object.values(CACHE_KEYS).forEach(clearCache);
  memoryCache.referralCode = null;
  memoryCache.pointsBalance = null;
  memoryCache.transactions = null;
  memoryCache.userLevel = null;
  console.log('🗑️ Cleared all promotions caches');
};

interface PromotionsProps {
  onBack: () => void;
}

interface PointsTransaction {
  id: string;
  amount: number;
  type: string;
  source: string;
  description: string;
  createdAt: string;
}

export default function Promotions({ onBack }: PromotionsProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'rewards'>('invite');
  const [promoCode, setPromoCode] = useState('');

  // Initialize with cached data for instant display
  const cachedCode = getCachedReferralCode();
  const cachedPoints = getCachedPointsBalance();
  const cachedLevel = getCachedUserLevel();
  const cachedTxs = getCachedTransactions();

  const [userPromoCode, setUserPromoCode] = useState(cachedCode || '');
  const [points, setPoints] = useState(cachedPoints ?? 0);
  const [currentLevel, setCurrentLevel] = useState(cachedLevel?.level ?? 1);
  const [levelName, setLevelName] = useState(cachedLevel?.name ?? 'Newbie');
  const [loading, setLoading] = useState(!cachedCode || cachedPoints === null);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(25);
  const [transactions, setTransactions] = useState<PointsTransaction[]>(cachedTxs || []);
  const [loadingTransactions, setLoadingTransactions] = useState(!cachedTxs);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const currentLevelCardRef = useRef<HTMLDivElement>(null);
  const hasScrolledToLevel = useRef(false);

  useEffect(() => {
    loadUserData();
    setupRealtimeSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (currentLevelCardRef.current && !loading && currentLevel > 0 && !hasScrolledToLevel.current) {
      hasScrolledToLevel.current = true;
      requestAnimationFrame(() => {
        if (currentLevelCardRef.current) {
          currentLevelCardRef.current.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'center'
          });
        }
      });
    }
  }, [currentLevel, loading]);

  const setupRealtimeSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscriptionRef.current = supabase
        .channel('points-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'points_transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Clear cache to force fresh data load
            clearCache(CACHE_KEYS.POINTS_BALANCE);
            clearCache(CACHE_KEYS.TRANSACTIONS);
            memoryCache.pointsBalance = null;
            memoryCache.transactions = null;
            loadPointsOnly();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Clear cache to force fresh data load
            clearCache(CACHE_KEYS.POINTS_BALANCE);
            clearCache(CACHE_KEYS.USER_LEVEL);
            memoryCache.pointsBalance = null;
            memoryCache.userLevel = null;
            loadPointsOnly();
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Error setting up realtime subscription:', err);
    }
  };

  const loadPointsOnly = async () => {
    try {
      const pointsResponse = isFeatureEnabled('USE_EDGE_POINTS')
        ? await pointsEdgeAPI.getBalance().catch(() => ({ userId: '', totalPoints: 0, availablePoints: 0, pendingPoints: 0 }))
        : await pointsAPI.getBalance().catch(() => ({ userId: '', totalPoints: 0, availablePoints: 0, pendingPoints: 0 }));

      const newPoints = pointsResponse.availablePoints || 0;
      setPoints(newPoints);
      setCachedPointsBalance(newPoints);

      // Load user level from database
      await loadUserLevel();

      // Also reload transactions when points change
      loadTransactions();
    } catch (err) {
      console.error('Error loading points:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      // Check cache first
      const cached = getCachedTransactions();
      if (cached && cached.length > 0) {
        console.log('📦 Using cached transactions');
        setTransactions(cached);
        setLoadingTransactions(false);
        return;
      }

      setLoadingTransactions(true);
      if (isFeatureEnabled('USE_EDGE_POINTS')) {
        const response = await pointsEdgeAPI.getTransactions(20).catch(() => ({ transactions: [], total: 0 }));
        const formattedTransactions = response.transactions?.map((t: any) => ({
          id: t.id,
          amount: t.points || t.amount,
          type: t.type,
          source: t.source,
          description: t.description,
          createdAt: t.createdAt,
        })) || [];
        setTransactions(formattedTransactions);
        setCachedTransactions(formattedTransactions);
      } else {
        const response = await pointsAPI.getTransactions().catch(() => []);
        setTransactions(response || []);
        setCachedTransactions(response || []);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadUserLevel = async () => {
    try {
      // Check cache first
      const cached = getCachedUserLevel();
      if (cached) {
        console.log('📦 Using cached user level');
        setCurrentLevel(cached.level);
        setLevelName(cached.name);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('current_level, level_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user level:', error);
        return;
      }

      if (data) {
        const level = data.current_level || 1;
        const name = data.level_name || 'Newbie';
        setCurrentLevel(level);
        setLevelName(name);
        setCachedUserLevel(level, name);
      }
    } catch (err) {
      console.error('Error loading user level:', err);
    }
  };

  const loadUserData = async () => {
    try {
      // Check if all data is cached and fresh
      const cachedCode = getCachedReferralCode();
      const cachedPoints = getCachedPointsBalance();
      const cachedLevel = getCachedUserLevel();
      const cachedTxs = getCachedTransactions();

      const hasAllCachedData = cachedCode && cachedPoints !== null && cachedLevel && cachedTxs;

      if (hasAllCachedData) {
        console.log('📦 All data loaded from cache - skipping API calls');
        setUserPromoCode(cachedCode);
        setPoints(cachedPoints);
        setCurrentLevel(cachedLevel.level);
        setLevelName(cachedLevel.name);
        setTransactions(cachedTxs);
        setLoading(false);
        setLoadingTransactions(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Display cached data immediately if available
      if (cachedCode) {
        setUserPromoCode(cachedCode);
      }
      if (cachedPoints !== null) {
        setPoints(cachedPoints);
      }
      if (cachedLevel) {
        setCurrentLevel(cachedLevel.level);
        setLevelName(cachedLevel.name);
      }
      if (cachedTxs) {
        setTransactions(cachedTxs);
        setLoadingTransactions(false);
      }

      // Fetch missing data in background
      const needsPromoCode = !cachedCode;
      const needsPoints = cachedPoints === null;

      if (needsPromoCode || needsPoints) {
        const promises: Promise<any>[] = [];

        if (needsPromoCode) {
          promises.push(
            isFeatureEnabled('USE_EDGE_PROMO_CODES')
              ? promoCodesEdgeAPI.getUserPromoCode().catch(() => ({ promoCode: '', referralCount: 0, totalPointsEarned: 0 }))
              : promoCodesAPI.getUserPromoCode().catch(() => ({ promoCode: '', referralCount: 0, totalPointsEarned: 0 }))
          );
        }

        if (needsPoints) {
          promises.push(
            isFeatureEnabled('USE_EDGE_POINTS')
              ? pointsEdgeAPI.getBalance().catch(() => ({ userId: '', totalPoints: 0, availablePoints: 0, pendingPoints: 0 }))
              : pointsAPI.getBalance().catch(() => ({ userId: '', totalPoints: 0, availablePoints: 0, pendingPoints: 0 }))
          );
        }

        const responses = await Promise.all(promises);
        let responseIndex = 0;

        if (needsPromoCode) {
          const promoResponse = responses[responseIndex++];
          const fetchedCode = promoResponse.promoCode || 'N/A';
          setUserPromoCode(fetchedCode);
          if (fetchedCode && fetchedCode !== 'N/A') {
            setCachedReferralCode(fetchedCode);
          }
        }

        if (needsPoints) {
          const pointsResponse = responses[responseIndex++];
          const newPoints = pointsResponse.availablePoints || 0;
          setPoints(newPoints);
          setCachedPointsBalance(newPoints);
        }
      }

      // Load user level if not cached
      if (!cachedLevel) {
        await loadUserLevel();
      }

      // Load transactions if not cached
      if (!cachedTxs) {
        await loadTransactions();
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Unable to load rewards data');
      // Use cached fallback values
      const cachedCode = getCachedReferralCode();
      const cachedPoints = getCachedPointsBalance();
      setUserPromoCode(cachedCode || 'N/A');
      setPoints(cachedPoints ?? 0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!promoCode.trim()) {
      setShowEmptyModal(true);
      return;
    }

    try {
      setActivating(true);
      const response = isFeatureEnabled('USE_EDGE_PROMO_CODES')
        ? await promoCodesEdgeAPI.applyPromoCode(promoCode.trim())
        : await promoCodesAPI.applyPromoCode({ promoCode: promoCode.trim() });

      if (response.success) {
        setEarnedPoints(response.pointsEarned || 25);
        setShowSuccessModal(true);
        setPromoCode('');

        // Clear points and transactions cache since they changed
        clearCache(CACHE_KEYS.POINTS_BALANCE);
        clearCache(CACHE_KEYS.TRANSACTIONS);
        memoryCache.pointsBalance = null;
        memoryCache.transactions = null;

        // Reload user data to get updated points
        await loadUserData();
      } else {
        // Check if it's a 24-hour window error or general failure
        const responseCode = (response as any).code;
        if (responseCode === 'OUTSIDE_24_HOUR_WINDOW' || responseCode === 'ALREADY_USED' || responseCode === 'SELF_REFERRAL') {
          setShowFailedModal(true);
        } else {
          // For invalid promo codes, show a simple alert
          alert(response.message || 'Invalid promo code');
        }
      }
    } catch (err) {
      console.error('Error applying promo code:', err);
      alert('Failed to activate promo code. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleShareLink = async () => {
    const shareText = `Join me on Pawa! Use my code: ${userPromoCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Pawa',
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Promo code copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto">
          <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b-2 border-gray-100">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-[1rem] transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('invite')}
                className={`pb-3 font-semibold transition-colors relative ${
                  activeTab === 'invite' ? 'text-gray-800' : 'text-gray-400'
                }`}
              >
                Invite
                {activeTab === 'invite' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`pb-3 font-semibold transition-colors relative ${
                  activeTab === 'rewards' ? 'text-gray-800' : 'text-gray-400'
                }`}
              >
                Rewards
                {activeTab === 'rewards' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400" />
                )}
              </button>
            </div>
          </div>

          {activeTab === 'invite' && (
            <div className="px-4 sm:px-6 pt-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-teal-600" />
                </div>
              </div>

              {loading && (
                <div className="flex justify-center mb-6">
                  <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                  <p className="text-red-700 text-center">{error}</p>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-bold text-orange-400 text-center mb-8">
                ENTER PROMO CODE
              </h1>

              <div className="mb-4">
                <label className="block text-gray-800 font-semibold text-center mb-3">
                  Enter Your Promo Code Here:
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="**********"
                  className="w-full bg-orange-50 rounded-2xl px-6 py-4 text-center text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <button
                onClick={handleActivate}
                disabled={activating || loading}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-[1rem] font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg mb-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {activating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Activating...
                  </>
                ) : (
                  'Activate'
                )}
              </button>

              <div className="text-center mb-6">
                <span className="text-gray-600 font-semibold">OR</span>
              </div>

              <h2 className="text-xl font-bold text-orange-400 text-center mb-4">
                Invite Friends
              </h2>

              <p className="text-center text-gray-700 mb-2">
                Explore a new way of dining, charging, and
              </p>
              <p className="text-center text-gray-700 mb-6">
                discovering the city. <span className="text-blue-500 font-semibold">Unlock rewards!</span>
              </p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-center text-gray-700 mb-2">
                  <span className="font-semibold">Share unique code:</span>{' '}
                  {loading ? (
                    <Loader2 className="w-4 h-4 inline-block animate-spin text-orange-400" />
                  ) : (
                    <span className="text-orange-400 font-bold">{userPromoCode}</span>
                  )}
                </p>
              </div>

              <button
                onClick={handleShareLink}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4 rounded-[1rem] font-bold text-lg hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share link
              </button>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="px-4 sm:px-6 pt-8">
              {loading && (
                <div className="flex justify-center mb-6">
                  <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                  <p className="text-red-700 text-center">{error}</p>
                </div>
              )}


              {/* Your Rewards Card */}
              <div className="bg-gradient-to-br from-orange-100 to-pink-100 rounded-3xl p-5 mb-6">
                <div className="text-center mb-4">
                  {loading ? (
                    <Loader2 className="w-8 h-8 mx-auto text-orange-400 animate-spin mb-2" />
                  ) : (
                    <>
                      <div className="text-5xl font-bold text-orange-500 mb-2">
                        {points} <span className="text-lg text-gray-500 font-normal">pts</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Level {currentLevel} - <span className="font-semibold">{levelName}</span>
                      </div>

                      {/* Progress Bar */}
                      {(() => {
                        const levelThresholds = [
                          { level: 1, min: 0, max: 49, name: 'Newbie' },
                          { level: 2, min: 50, max: 149, name: 'Explorer' },
                          { level: 3, min: 150, max: 299, name: 'Enthusiast' },
                          { level: 4, min: 300, max: 599, name: 'Ambassador' },
                          { level: 5, min: 600, max: Infinity, name: 'Legend' }
                        ];

                        const currentThreshold = levelThresholds.find(t => t.level === currentLevel) || levelThresholds[0];
                        const nextThreshold = levelThresholds.find(t => t.level === currentLevel + 1);

                        if (!nextThreshold) {
                          // Max level reached
                          return (
                            <div className="mt-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">Max Level Reached!</span>
                                <span className="text-xs font-semibold text-orange-600">{points} pts</span>
                              </div>
                              <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full" style={{ width: '100%' }}></div>
                              </div>
                            </div>
                          );
                        }

                        const pointsInCurrentLevel = points - currentThreshold.min;
                        const pointsNeededForNextLevel = nextThreshold.min - currentThreshold.min;
                        const progressPercentage = Math.min(100, Math.max(0, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
                        const pointsToNextLevel = nextThreshold.min - points;

                        return (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">{currentThreshold.min} pts</span>
                              {pointsToNextLevel > 0 && (
                                <span className="text-xs text-gray-600">{pointsToNextLevel} pts to next level</span>
                              )}
                              <span className="text-xs text-gray-600">{nextThreshold.min} pts</span>
                            </div>
                            <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-3 text-center">
                  <p className="text-sm text-gray-700">
                    Use your points to unlock exclusive deals and discounts!
                  </p>
                </div>
              </div>


              {/* All levels & Rewards */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">All levels & Rewards</h2>
                  <div className="flex gap-1">
                    <div className="w-8 h-1 bg-orange-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  </div>
                </div>

                <div className="flex gap-3 mb-6 overflow-x-auto pb-2 pt-3 scrollbar-hide -mx-4 px-4 scroll-smooth">
                  {/* Level 1 Card */}
                  <div
                    ref={currentLevel === 1 ? currentLevelCardRef : null}
                    className={`rounded-2xl p-3 flex-shrink-0 w-[170px] relative ${currentLevel === 1 ? 'bg-teal-100 border-2 border-teal-500 shadow-lg' : 'bg-teal-50 border-2 border-transparent'}`}
                  >
                    {currentLevel === 1 && (
                      <div className="absolute -top-2 left-2 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        CURRENT
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">🌱</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-0.5">Level 1</div>
                        <div className="text-sm font-bold text-teal-600 mb-0.5">Newbie</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">0 - 49 Points</div>
                      </div>
                    </div>
                  </div>

                  {/* Level 2 Card */}
                  <div
                    ref={currentLevel === 2 ? currentLevelCardRef : null}
                    className={`rounded-2xl p-3 flex-shrink-0 w-[170px] relative ${currentLevel === 2 ? 'bg-orange-100 border-2 border-orange-500 shadow-lg' : 'bg-orange-50 border-2 border-transparent'}`}
                  >
                    {currentLevel === 2 && (
                      <div className="absolute -top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        CURRENT
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">🏆</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-0.5">Level 2</div>
                        <div className="text-sm font-bold text-orange-600 mb-0.5">Explorer</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">50 - 149 Points</div>
                      </div>
                    </div>
                  </div>

                  {/* Level 3 Card */}
                  <div
                    ref={currentLevel === 3 ? currentLevelCardRef : null}
                    className={`rounded-2xl p-3 flex-shrink-0 w-[170px] relative ${currentLevel === 3 ? 'bg-green-100 border-2 border-green-500 shadow-lg' : 'bg-green-50 border-2 border-transparent'}`}
                  >
                    {currentLevel === 3 && (
                      <div className="absolute -top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        CURRENT
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">⚡</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-0.5">Level 3</div>
                        <div className="text-sm font-bold text-green-600 mb-0.5">Enthusiast</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">150 - 299 Points</div>
                      </div>
                    </div>
                  </div>

                  {/* Level 4 Card */}
                  <div
                    ref={currentLevel === 4 ? currentLevelCardRef : null}
                    className={`rounded-2xl p-3 flex-shrink-0 w-[170px] relative ${currentLevel === 4 ? 'bg-blue-100 border-2 border-blue-500 shadow-lg' : 'bg-blue-50 border-2 border-transparent'}`}
                  >
                    {currentLevel === 4 && (
                      <div className="absolute -top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        CURRENT
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">🎖️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-0.5">Level 4</div>
                        <div className="text-sm font-bold text-blue-600 mb-0.5">Ambassador</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">300 - 599 Points</div>
                      </div>
                    </div>
                  </div>

                  {/* Level 5 Card */}
                  <div
                    ref={currentLevel === 5 ? currentLevelCardRef : null}
                    className={`rounded-2xl p-3 flex-shrink-0 w-[170px] relative ${currentLevel === 5 ? 'bg-amber-100 border-2 border-amber-500 shadow-lg' : 'bg-amber-50 border-2 border-transparent'}`}
                  >
                    {currentLevel === 5 && (
                      <div className="absolute -top-2 left-2 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        CURRENT
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg">👑</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-0.5">Level 5</div>
                        <div className="text-sm font-bold text-amber-600 mb-0.5">Legend</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">600+ Points</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Earning Points */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Earning Points</h2>
                <p className="text-sm text-gray-600 mb-4">
                  You earn points (pt) by completing various actions, redeem them for online shopping discounts.
                </p>

                <div className="bg-blue-50 rounded-2xl p-4 space-y-4">
                  {/* Charge up */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <Battery className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        Charge up
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Earn points each time you rent and return a power bank within 24 hours!
                      </p>
                    </div>
                  </div>

                  {/* Booking */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <Utensils className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        Booking
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Enjoy delicious dining and earn points by sharing dining pics & reviews!
                      </p>
                    </div>
                  </div>

                  {/* Referrals */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        Referrals
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Invite friends to PawaTasty and earn points when they join using your referral.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Points History */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Points History</h2>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="w-8 h-1 bg-orange-400 rounded-full"></div>
                  </div>
                </div>

                {loadingTransactions && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                  </div>
                )}

                {!loadingTransactions && transactions.length === 0 && (
                  <div className="bg-gray-50 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 text-sm">No points history yet</p>
                    <p className="text-gray-400 text-xs mt-1">Complete bookings to earn points!</p>
                  </div>
                )}

                {!loadingTransactions && transactions.length > 0 && (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <div className="flex gap-3 pb-2">
                      {transactions.slice(0, 10).map((transaction) => {
                        const getTitle = () => {
                          if (transaction.source === 'referral') return 'Referral Activated';
                          if (transaction.source === 'booking') return 'Booking Completed';
                          if (transaction.source === 'rental') return 'Rental Completed';
                          if (transaction.source === 'subscription') return 'Rental Completed';
                          if (transaction.source === 'welcome') return 'New Joiner';
                          if (transaction.source === 'promo') return 'New Joiner';
                          return 'Points earned';
                        };

                        const getTimeAgo = () => {
                          const now = new Date();
                          const created = new Date(transaction.createdAt);
                          const diffInMs = now.getTime() - created.getTime();
                          const diffInMins = Math.floor(diffInMs / (1000 * 60));
                          const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                          const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                          if (diffInMins < 60) return `${diffInMins}m ago`;
                          if (diffInHours < 24) return `${diffInHours}h ago`;
                          return `${diffInDays}d ago`;
                        };

                        const isExpanded = expandedTransactionId === transaction.id;

                        return (
                          <div
                            key={transaction.id}
                            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm cursor-pointer active:scale-95 transition-all flex-shrink-0 w-[160px]"
                            onClick={() => setExpandedTransactionId(isExpanded ? null : transaction.id)}
                          >
                            <div className="font-semibold text-gray-900 mb-1 text-xs truncate">{getTitle()}</div>
                            <div className={`text-sm font-medium mb-2 ${transaction.type === 'earned' ? 'text-green-700' : 'text-red-600'}`}>
                              {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} points
                            </div>
                            {isExpanded && (
                              <p className="text-[10px] text-gray-600 mb-2 line-clamp-3">
                                {transaction.description}
                              </p>
                            )}
                            <div className="text-[10px] text-gray-400">{getTimeAgo()}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {showEmptyModal && (
        <EmptyPromoCodeModal onClose={() => setShowEmptyModal(false)} />
      )}

      {showFailedModal && (
        <PromoCodeFailedModal onClose={() => setShowFailedModal(false)} />
      )}

      {showSuccessModal && (
        <PromoCodeSuccessModal
          onClose={() => setShowSuccessModal(false)}
          pointsEarned={earnedPoints}
        />
      )}
    </div>
  );
}
