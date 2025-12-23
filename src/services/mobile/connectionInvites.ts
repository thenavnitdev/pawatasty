import { callEdgeFunction } from '../edgeFunctions';

export interface ConnectionInvite {
  id: number;
  sender_user_id: string;
  sender_link_id: string;
  sender_name: string;
  recipient_user_id: string;
  status: 'pending' | 'accepted' | 'ignored';
  created_at: string;
  responded_at?: string;
}

export interface UserConnection {
  user_id: string;
  full_name: string;
  link_id: string;
  profile_picture?: string;
}

export const connectionInvitesAPI = {
  async sendInvite(recipientLinkId: string): Promise<{ success: boolean; invite?: ConnectionInvite; error?: string; message?: string }> {
    return callEdgeFunction('connection-invites', 'send', {
      method: 'POST',
      body: { recipientLinkId },
    });
  },

  async getPendingInvites(): Promise<{ success: boolean; invites: ConnectionInvite[]; error?: string }> {
    return callEdgeFunction('connection-invites', 'pending', {
      method: 'GET',
    });
  },

  async getSentInvites(): Promise<{ success: boolean; invites: ConnectionInvite[]; error?: string }> {
    return callEdgeFunction('connection-invites', 'sent', {
      method: 'GET',
    });
  },

  async respondToInvite(inviteId: number, action: 'accept' | 'ignore'): Promise<{ success: boolean; message?: string; connectionId?: number; error?: string }> {
    return callEdgeFunction('connection-invites', 'respond', {
      method: 'POST',
      body: { inviteId, action },
    });
  },

  async getConnections(): Promise<{ success: boolean; connections: UserConnection[]; error?: string }> {
    return callEdgeFunction('connection-invites', 'connections', {
      method: 'GET',
    });
  },

  async removeConnection(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return callEdgeFunction('connection-invites', 'remove', {
      method: 'DELETE',
      body: { userId },
    });
  },
};
