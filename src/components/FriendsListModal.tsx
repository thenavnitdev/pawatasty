import { useState, useEffect } from 'react';
import { X, Users, UserMinus, Loader2 } from 'lucide-react';
import { connectionInvitesAPI, UserConnection } from '../services/mobile/connectionInvites';
import { useToast } from '../utils/toastContext';
import { supabase } from '../lib/supabase';

interface FriendsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionsCountChange?: (count: number) => void;
}

export default function FriendsListModal({ isOpen, onClose, onConnectionsCountChange }: FriendsListModalProps) {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  // Realtime subscription for new connections
  useEffect(() => {
    let subscription: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel('user_connections_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_connections',
          },
          (payload) => {
            console.log('New connection added:', payload);
            // Reload connections when a new one is added
            loadConnections();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'user_connections',
          },
          (payload) => {
            console.log('Connection removed:', payload);
            // Reload connections when one is removed
            loadConnections();
          }
        )
        .subscribe();
    };

    if (isOpen) {
      setupRealtimeSubscription();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [isOpen]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const result = await connectionInvitesAPI.getConnections();
      if (result.success) {
        setConnections(result.connections);
        onConnectionsCountChange?.(result.connections.length);
      } else {
        showToast(result.error || 'Failed to load connections', 'error');
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      showToast('Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this connection?')) {
      return;
    }

    setRemovingId(userId);
    try {
      const result = await connectionInvitesAPI.removeConnection(userId);
      if (result.success) {
        showToast('Connection removed', 'success');
        const newConnections = connections.filter(c => c.user_id !== userId);
        setConnections(newConnections);
        onConnectionsCountChange?.(newConnections.length);
      } else {
        showToast(result.error || 'Failed to remove connection', 'error');
      }
    } catch (error) {
      console.error('Error removing connection:', error);
      showToast('Failed to remove connection', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between rounded-t-3xl border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Friends List</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No friends yet</p>
              <p className="text-sm text-gray-400 mt-1">Send connection invites to add friends</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div
                  key={connection.user_id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                      {connection.profile_picture ? (
                        <img
                          src={connection.profile_picture}
                          alt={connection.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-lg font-bold">
                          {connection.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 truncate">
                        {connection.full_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-semibold">Link ID:</span> {connection.link_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveConnection(connection.user_id)}
                      disabled={removingId === connection.user_id}
                      className="p-2 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove connection"
                    >
                      {removingId === connection.user_id ? (
                        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                      ) : (
                        <UserMinus className="w-5 h-5 text-red-500" />
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
