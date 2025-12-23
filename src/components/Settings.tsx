import { ChevronLeft, ChevronRight, Settings as SettingsIcon, User, Bell, Globe, CreditCard, HelpCircle, Lock, FileText, LogOut } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../services/mobile';
import { supabase } from '../lib/supabase';
import PersonalInformation from './PersonalInformation';
import PrivacyPolicy from './PrivacyPolicy';
import TermsAndConditions from './TermsAndConditions';
import HelpCenter from './HelpCenter';
import LogoutConfirmationModal from './LogoutConfirmationModal';
import PaymentMethods from './PaymentMethods';

interface SettingsProps {
  onClose: () => void;
  onNavigateToMap: () => void;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone_nr?: string;
  };
}

export default function Settings({ onClose, onNavigateToMap, userProfile }: SettingsProps) {
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();

      apiClient.setAuthToken(null);

      localStorage.removeItem('api_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('supabase_user');

      sessionStorage.clear();

      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);

      apiClient.setAuthToken(null);
      localStorage.clear();
      sessionStorage.clear();

      window.location.href = '/';
    }
  };

  if (showPersonalInfo) {
    return <PersonalInformation onClose={() => setShowPersonalInfo(false)} />;
  }

  if (showPrivacyPolicy) {
    return <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} onNavigateToMap={onNavigateToMap} />;
  }

  if (showTermsAndConditions) {
    return <TermsAndConditions onClose={() => setShowTermsAndConditions(false)} onNavigateToMap={onNavigateToMap} />;
  }

  if (showHelpCenter) {
    return <HelpCenter onBack={() => setShowHelpCenter(false)} />;
  }

  if (showPaymentMethods) {
    return <PaymentMethods onClose={() => setShowPaymentMethods(false)} userProfile={userProfile} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      <div className="h-full overflow-y-auto pb-24">
        <div className="min-h-full w-full max-w-md mx-auto bg-gray-50">
          <div className="sticky top-0 bg-gray-50 z-10 px-4 py-4 flex items-center border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="flex-1 text-center text-xl font-bold text-gray-900 pr-10">Settings</h1>
          </div>

          <div className="px-4 py-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3 px-2">Account Settings</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowPersonalInfo(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Personal Information</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Notifications</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Language</span>
                  </div>
                  <span className="text-gray-500 text-sm">English</span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3 px-2">Payments</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowPaymentMethods(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Payment methods</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3 px-2">Help & Support</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowHelpCenter(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Help Center</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                  onClick={() => setShowPrivacyPolicy(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Privacy</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                  onClick={() => setShowTermsAndConditions(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-700" />
                    <span className="text-gray-900 font-medium">Terms & Conditions</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <p className="text-center text-gray-400 text-sm mt-8 pb-4">Version 1.0.4</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 z-20" style={{ paddingBottom: '14px' }}>
        <div className="w-full max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-4 rounded-[1rem] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
