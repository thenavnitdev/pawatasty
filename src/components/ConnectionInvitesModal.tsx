import { useState, useEffect, useRef } from 'react';
import { UserPlus, Check, XCircle } from 'lucide-react';
import { connectionInvitesAPI, ConnectionInvite } from '../services/mobile/connectionInvites';
import { useToast } from '../utils/toastContext';
import { supabase } from '../lib/supabase';

// Cache configuration
const INVITES_CACHE_KEY = 'connection_invites_cache';
const INVITES_CACHE_EXPIRY = 2 * 60 * 1000; // 2 minutes

// In-memory cache
let cachedInvites: ConnectionInvite[] | null = null;
let cacheTimestamp: number = 0;

const getCachedInvites = (): ConnectionInvite[] | null => {
  // Check memory cache first
  if (cachedInvites && Date.now() - cacheTimestamp < INVITES_CACHE_EXPIRY) {
    console.log('📦 Using cached invites from memory');
    return cachedInvites;
  }

  // Check localStorage
  try {
    const cached = localStorage.getItem(INVITES_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < INVITES_CACHE_EXPIRY) {
        console.log('📦 Using cached invites from localStorage');
        cachedInvites = data;
        cacheTimestamp = timestamp;
        return data;
      } else {
        console.log('🗑️ Invites cache expired');
        localStorage.removeItem(INVITES_CACHE_KEY);
      }
    }
  } catch (e) {
    console.warn('Error reading cached invites:', e);
  }

  return null;
};

const setCachedInvites = (invites: ConnectionInvite[]) => {
  const timestamp = Date.now();
  cachedInvites = invites;
  cacheTimestamp = timestamp;

  try {
    localStorage.setItem(INVITES_CACHE_KEY, JSON.stringify({
      data: invites,
      timestamp,
    }));
    console.log('✅ Cached connection invites');
  } catch (e) {
    console.warn('Failed to cache invites:', e);
  }
};

const clearInvitesCache = () => {
  cachedInvites = null;
  cacheTimestamp = 0;
  localStorage.removeItem(INVITES_CACHE_KEY);
  console.log('🗑️ Cleared invites cache');
};

interface ConnectionInvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteCountChange?: (count: number) => void;
  onConnectionsCountChange?: (count: number) => void;
}

export default function ConnectionInvitesModal({ isOpen, onClose, onInviteCountChange, onConnectionsCountChange }: ConnectionInvitesModalProps) {
  // Initialize with cached data
  const initialInvites = isOpen ? getCachedInvites() : null;
  const [invites, setInvites] = useState<ConnectionInvite[]>(initialInvites || []);
  const [loading, setLoading] = useState(!initialInvites);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const { showToast } = useToast();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Check cache first
      const cached = getCachedInvites();
      if (cached) {
        setInvites(cached);
        setLoading(false);
        onInviteCountChange?.(cached.length);
        hasLoadedRef.current = true;
        return;
      }

      // Only load if not already loaded with cache
      if (!hasLoadedRef.current) {
        loadInvites();
        hasLoadedRef.current = true;
      }
    }
  }, [isOpen]);

  // Realtime subscription for new invites
  useEffect(() => {
    let subscription: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel('connection_invites_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'connection_invites',
            filter: `recipient_user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New invite received:', payload);
            const newInvite = payload.new as ConnectionInvite;
            setInvites(prev => {
              const updated = [newInvite, ...prev];
              setCachedInvites(updated);
              onInviteCountChange?.(updated.length);
              return updated;
            });
            showToast(`New connection request from ${newInvite.sender_name}`, 'success');
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [onInviteCountChange, showToast]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const result = await connectionInvitesAPI.getPendingInvites();
      if (result.success) {
        setInvites(result.invites);
        setCachedInvites(result.invites);
        onInviteCountChange?.(result.invites.length);
      } else {
        showToast(result.error || 'Failed to load invites', 'error');
      }
    } catch (error) {
      console.error('Error loading invites:', error);
      showToast('Failed to load invites', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (inviteId: number, action: 'accept' | 'ignore') => {
    setRespondingTo(inviteId);
    try {
      const result = await connectionInvitesAPI.respondToInvite(inviteId, action);
      if (result.success) {
        showToast(
          action === 'accept' ? 'Connection established!' : 'Invite ignored',
          'success'
        );
        // Remove the invite from the list
        const newInvites = invites.filter(inv => inv.id !== inviteId);
        setInvites(newInvites);
        setCachedInvites(newInvites);
        onInviteCountChange?.(newInvites.length);

        // If accepted, reload connections count
        if (action === 'accept') {
          const connectionsResult = await connectionInvitesAPI.getConnections();
          if (connectionsResult.success) {
            onConnectionsCountChange?.(connectionsResult.connections.length);
          }
        }
      } else {
        showToast(result.error || `Failed to ${action} invite`, 'error');
      }
    } catch (error) {
      console.error(`Error ${action}ing invite:`, error);
      showToast(`Failed to ${action} invite`, 'error');
    } finally {
      setRespondingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-center rounded-t-3xl border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Connection Invites</h2>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No pending invites</p>
              <p className="text-sm text-gray-400 mt-1">Share your Link ID to connect with friends</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg font-bold">
                        {invite.sender_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-bold">{invite.sender_name}</span> sent you a connection request
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-semibold">Link ID:</span> {invite.sender_link_id}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(invite.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(invite.id, 'accept')}
                      disabled={respondingTo === invite.id}
                      className="flex-1 bg-[#1e3a5f] text-white py-2.5 rounded-xl font-semibold hover:bg-[#152a45] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {respondingTo === invite.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Accept
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRespond(invite.id, 'ignore')}
                      disabled={respondingTo === invite.id}
                      className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {respondingTo === invite.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Ignore
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
