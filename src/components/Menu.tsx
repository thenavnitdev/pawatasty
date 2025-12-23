import { useState, useEffect } from 'react';
import { X, ChevronRight, Gift, CreditCard, Clock, Play, HelpCircle, Settings, User, UserPlus, Users } from 'lucide-react';
import CachedProfileImage from './CachedProfileImage';
import { promoContentAPI, PromoContent } from '../services/mobile/promoContent';

// Cache key and expiry for promo content
const PROMO_CACHE_KEY = 'menu_promo_content';
const PROMO_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Get cached promo content
const getCachedPromos = (): PromoContent[] | null => {
  try {
    const cached = sessionStorage.getItem(PROMO_CACHE_KEY);
    if (cached) {
      const { promos, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < PROMO_CACHE_EXPIRY) {
        console.log('📦 Using cached promo content');
        return promos;
      } else {
        console.log('🗑️ Cached promo content expired');
        sessionStorage.removeItem(PROMO_CACHE_KEY);
      }
    }
  } catch (e) {
    console.warn('Error reading cached promo content:', e);
  }
  return null;
};

// Cache promo content
const setCachedPromos = (promos: PromoContent[]) => {
  try {
    sessionStorage.setItem(PROMO_CACHE_KEY, JSON.stringify({
      promos,
      timestamp: Date.now(),
    }));
    console.log('✅ Promo content cached');
  } catch (e) {
    console.warn('Failed to cache promo content:', e);
  }
};

interface UserProfile {
  full_name: string;
  current_level?: number;
  available_points?: number;
  total_points?: number;
  points_count?: number;
  total_savings?: number | string;
  total_savings_amount?: string;
  profile_picture?: string;
}

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPromotions: () => void;
  onOpenMembership: () => void;
  onOpenHistory: () => void;
  onOpenHelpCenter: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenLinkId: () => void;
  onOpenConnectionInvites: () => void;
  onOpenFriendsList: () => void;
  connectionInvitesCount: number;
  connectionsCount: number;
  userProfile: UserProfile | null;
}

export default function Menu({ isOpen, onClose, onOpenPromotions, onOpenMembership, onOpenHistory, onOpenHelpCenter, onOpenSettings, onOpenProfile, onOpenLinkId, onOpenConnectionInvites, onOpenFriendsList, connectionInvitesCount, connectionsCount, userProfile }: MenuProps) {
  // Initialize with cached promos for instant display
  const [promos, setPromos] = useState<PromoContent[]>(() => getCachedPromos() || []);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [loadingPromos, setLoadingPromos] = useState(false);

  // Load promo content only once when component first mounts
  useEffect(() => {
    const loadPromos = async () => {
      // Check cache first
      const cachedPromos = getCachedPromos();
      if (cachedPromos && cachedPromos.length > 0) {
        console.log('📦 Using cached promos, skipping API call');
        return;
      }

      // Load from API if no cache
      try {
        console.log('🌐 Fetching fresh promo content');
        const response = await promoContentAPI.getActivePromos();
        if (response.success && response.promos) {
          setPromos(response.promos);
          setCurrentPromoIndex(0);
          setCachedPromos(response.promos);
        }
      } catch (error) {
        console.error('Failed to load promo content:', error);
      }
    };

    loadPromos();
  }, []); // Only run once on mount

  const currentPromo = promos[currentPromoIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-800" />
          </button>
          <button onClick={onOpenLinkId} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-gray-800">
              <path fill="currentColor" d="M4 4h6v6H4zm16 0v6h-6V4zm-6 11h2v-2h-2v-2h2v2h2v-2h2v2h-2v2h2v3h-2v2h-2v-2h-3v2h-2v-4h3zm2 0v3h2v-3zM4 20v-6h6v6zM6 6v2h2V6zm10 0v2h2V6zM6 16v2h2v-2zm-2-5h2v2H4zm5 0h4v4h-2v-2H9zm2-5h2v4h-2zM2 2v4H0V2a2 2 0 0 1 2-2h4v2zm20-2a2 2 0 0 1 2 2v4h-2V2h-4V0zM2 18v4h4v2H2a2 2 0 0 1-2-2v-4zm20 4v-4h2v4a2 2 0 0 1-2 2h-4v-2z"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative flex-shrink-0">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden ${!userProfile?.profile_picture ? 'bg-gradient-to-br from-orange-400 to-pink-500' : ''}`}>
              <CachedProfileImage
                imagePath={userProfile?.profile_picture}
                userName={userProfile?.full_name || 'Guest'}
                size="medium"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-white text-[10px] sm:text-xs font-bold">{userProfile?.current_level || 1}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Hi {userProfile?.full_name || 'Guest'}</h2>
            {(connectionsCount > 0 || connectionInvitesCount > 0) && (
              <div className="flex items-center gap-2 mt-1">
                {connectionsCount > 0 && (
                  <span className="text-xs text-gray-600">
                    {connectionsCount} Connection{connectionsCount !== 1 ? 's' : ''}
                  </span>
                )}
                {connectionsCount > 0 && connectionInvitesCount > 0 && (
                  <span className="text-xs text-gray-400">•</span>
                )}
                {connectionInvitesCount > 0 && (
                  <span className="text-xs text-gray-600">
                    {connectionInvitesCount} Pending Invite{connectionInvitesCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-bold text-gray-800">{userProfile?.current_level || 1}</span>
            <div className="flex-1 h-3 bg-[#EFEFEF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFA374] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(((userProfile?.current_level || 1) - 1) / 4 * 100, 100)}%` }}
              />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-800">5</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 pl-6">
            {userProfile?.current_level === 5
              ? 'You have reached the maximum level!'
              : `Charge and dine more to reach level ${(userProfile?.current_level || 1) + 1}!`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-[#FBE6F5] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-6 h-6 text-[#203F55]" />
              <span className="text-xl sm:text-2xl font-bold text-[#203F55]">
                {userProfile?.available_points ?? userProfile?.total_points ?? userProfile?.points_count ?? 0}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#203F55]">Credit points</p>
          </div>
          <div className="bg-[#E4F5FE] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-2 mb-1">
              <img src="/wallet-bold.svg" alt="Wallet" className="w-6 h-6" style={{ filter: 'brightness(0) saturate(100%) invert(18%) sepia(14%) saturate(1366%) hue-rotate(158deg) brightness(95%) contrast(89%)' }} />
              <span className="text-xl sm:text-2xl font-bold text-[#203F55]">
                €{userProfile?.total_savings ? parseFloat(String(userProfile.total_savings)).toFixed(2) : userProfile?.total_savings_amount ? parseFloat(userProfile.total_savings_amount).toFixed(2) : '0.00'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#203F55]">Money saved</p>
          </div>
        </div>

        {promos.length > 0 && currentPromo && (
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="text-white font-bold text-base sm:text-lg flex-1 line-clamp-1">
                  {currentPromo.promo_title}
                </h3>
                <button
                  onClick={() => {
                    if (currentPromoIndex < promos.length - 1) {
                      setCurrentPromoIndex(currentPromoIndex + 1);
                    } else {
                      setCurrentPromoIndex(0);
                    }
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
              {currentPromo.content_type === 'text' && currentPromo.text_content && (
                <p className="text-gray-300 text-sm sm:text-base mb-2 line-clamp-2">
                  {currentPromo.text_content}
                </p>
              )}
              {currentPromo.content_type === 'image' && currentPromo.image_url && (
                <img
                  src={currentPromo.image_url}
                  alt={currentPromo.promo_title}
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
              )}
              {promos.length > 1 && (
                <div className="flex gap-1.5 justify-center mt-1">
                  {promos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPromoIndex(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        index === currentPromoIndex ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="space-y-1 pb-4">
          <button onClick={onOpenPromotions} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">Promotions</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          {connectionInvitesCount > 0 && (
            <button onClick={onOpenConnectionInvites} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                <span className="font-semibold text-gray-800">Connection Invites</span>
                <span className="bg-[#FF8C5A] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {connectionInvitesCount}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </button>
          )}

          {/* <button onClick={onOpenFriendsList} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">Friends List</span>
              {connectionsCount > 0 && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {connectionsCount}
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button> */}

          <button onClick={onOpenMembership} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">Memberships</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button onClick={onOpenHistory} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">History</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">Quick tutorial</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button onClick={onOpenHelpCenter} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">Help center</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>

          <button onClick={onOpenSettings} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-[1rem] transition-colors group">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="font-semibold text-gray-800">Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </nav>
        </div>
      </div>
    </div>
  );
}
