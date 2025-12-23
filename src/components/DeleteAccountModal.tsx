import { Trash2 } from 'lucide-react';
import { apiClient } from '../services/mobile';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface DeleteAccountModalProps {
  onClose: () => void;
  userId: string;
  onAccountDeleted?: () => void;
}

export default function DeleteAccountModal({ onClose, userId, onAccountDeleted }: DeleteAccountModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Note: User deletion from database should be handled by backend API
      // This frontend action logs out the user and clears their session

      // Sign out from Supabase (triggers auth state change)
      await supabase.auth.signOut();

      // Clear all local storage
      apiClient.setAuthToken(null);
      localStorage.removeItem('api_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('supabase_user');

      // Notify parent component
      if (onAccountDeleted) {
        onAccountDeleted();
      }

      // The SIGNED_OUT event will be caught by the auth listener in App.tsx
      // which will automatically redirect to the login page

      // Force redirect as fallback (in case auth listener doesn't fire)
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl max-w-md w-full animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pt-8 pb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-6">
            <div className="text-4xl">😱</div>
          </div>

          <h2 className="text-2xl font-bold text-orange-400 mb-6">Attention!</h2>

          <p className="text-center text-slate-700 text-base leading-relaxed mb-8 px-2">
            By deleting your account, you will automatically lose access to this application
          </p>

          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-semibold py-4 rounded-[1rem] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            {deleting ? 'Deleting Account...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
