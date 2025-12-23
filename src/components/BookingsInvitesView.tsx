import { useState, useEffect } from 'react';
import { ChevronLeft, Check, XCircle } from 'lucide-react';
import { connectionInvitesAPI, ConnectionInvite } from '../services/mobile/connectionInvites';
import { useToast } from '../utils/toastContext';
import { supabase } from '../lib/supabase';

interface BookingsInvitesViewProps {
  onBack: () => void;
  onOpenHistory: () => void;
  onInviteCountChange?: (count: number) => void;
}

export default function BookingsInvitesView({ onBack, onOpenHistory, onInviteCountChange }: BookingsInvitesViewProps) {
  const [invites, setInvites] = useState<ConnectionInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadInvites();
  }, []);

  // Realtime subscription for new invites
  useEffect(() => {
    let subscription: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel('bookings_invites_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'connection_invites',
            filter: `recipient_user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New invite received in BookingsInvitesView:', payload);
            const newInvite = payload.new as ConnectionInvite;
            setInvites(prev => {
              const updated = [newInvite, ...prev];
              onInviteCountChange?.(updated.length);
              return updated;
            });
            showToast(`New connection request from ${newInvite.sender_name}`, 'success');
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
            console.log('Invite updated in BookingsInvitesView:', payload);
            const updatedInvite = payload.new as ConnectionInvite;

            // Remove invite if it's no longer pending (accepted/ignored elsewhere)
            if (updatedInvite.status !== 'pending') {
              setInvites(prev => {
                const updated = prev.filter(inv => inv.id !== updatedInvite.id);
                onInviteCountChange?.(updated.length);
                return updated;
              });
            }
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
        onInviteCountChange?.(newInvites.length);
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

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="px-4 pt-6 pb-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button onClick={onOpenHistory} className="font-medium" style={{ color: '#203F55' }}>History</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 mt-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : invites.length === 0 ? (
            <div className="flex items-center justify-center py-16 px-6">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mx-auto mb-3">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <p className="text-gray-600 text-base font-medium mb-1">No New Invites</p>
                <p className="text-gray-500 text-sm">Connection invites will appear here when friends send them.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg font-bold">
                        {invite.sender_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 mb-1">
                        <span className="font-bold">{invite.sender_name}</span> sent you a connection request
                      </p>
                      <p className="text-xs text-gray-500">
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
                      className="flex-1 bg-[#FF8C5A] text-white py-2.5 rounded-xl font-semibold hover:bg-[#FF7A42] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
