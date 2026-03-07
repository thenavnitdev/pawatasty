import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, ChevronDown, Search, Check, AlertCircle } from 'lucide-react';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/phoneValidation';
import { detectFacebookApp, openFacebookAppForAuth } from '../utils/facebookAppDetection';

interface LoginProps {
  onLogin: () => void;
  onOTPRequired?: (phoneNumber: string) => void;
}

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const countryCodes: CountryCode[] = [
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
  { code: 'IS', name: 'Iceland', dialCode: '+354', flag: '🇮🇸' },
  { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357', flag: '🇨🇾' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
  { code: 'MC', name: 'Monaco', dialCode: '+377', flag: '🇲🇨' },
  { code: 'SM', name: 'San Marino', dialCode: '+378', flag: '🇸🇲' },
  { code: 'VA', name: 'Vatican City', dialCode: '+379', flag: '🇻🇦' },
  { code: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩' },
];

export default function Login({ onLogin, onOTPRequired }: LoginProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const filteredCountries = countryCodes.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.dialCode.includes(countrySearchQuery) ||
    country.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the Terms & Privacy Policy to continue');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isMobileApp = typeof (window as any).ReactNativeWebView !== 'undefined';
      // Use explicit localhost for development, fallback to origin
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isMobileApp 
        ? 'pawatasty://auth/callback' 
        : isDevelopment 
          ? `http://localhost:${window.location.port || '5173'}`
          : window.location.origin;

      console.log('🔑 Starting Google OAuth...');
      console.log('  - Mobile app:', isMobileApp);
      console.log('  - Is development:', isDevelopment);
      console.log('  - Redirect URL:', redirectUrl);
      console.log('  - Current URL:', window.location.href);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        if (error.message.includes('not enabled') || error.message.includes('not configured')) {
          setError('Google sign-in is not configured yet. Please use phone sign-in or contact support.');
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else {
        console.log('✅ Google OAuth initiated:', data);
      }
    } catch (err) {
      console.error('❌ Google sign-in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the Terms & Privacy Policy to continue');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isMobileApp = typeof (window as any).ReactNativeWebView !== 'undefined';
      // Use explicit localhost for development, fallback to origin
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isMobileApp 
        ? 'pawatasty://auth/callback' 
        : isDevelopment 
          ? `http://localhost:${window.location.port || '5173'}`
          : window.location.origin;

      console.log('🔑 Starting Facebook OAuth...');
      console.log('  - Mobile app:', isMobileApp);
      console.log('  - Is development:', isDevelopment);
      console.log('  - Redirect URL:', redirectUrl);

      console.log('🔍 Detecting Facebook app installation...');
      const detection = await detectFacebookApp();
      console.log('  - Facebook app installed:', detection.isInstalled);
      console.log('  - Should use native app:', detection.shouldUseNativeApp);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: detection.shouldUseNativeApp,
          scopes: 'email,public_profile',
        }
      });

      if (error) {
        console.error('❌ Facebook OAuth error:', error);
        console.error('  - Error message:', error.message);
        console.error('  - Error status:', error.status);
        console.error('  - Error code:', error.code);

        if (error.message.includes('not enabled') || error.message.includes('not configured') || error.message.includes('not found')) {
          setError('Facebook sign-in is not configured. Please enable it in Supabase Dashboard → Authentication → Providers → Facebook, or use phone sign-in instead.');
        } else if (error.message.includes('redirect')) {
          setError('Redirect configuration error. Please contact support.');
        } else {
          setError(`Facebook sign-in error: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data?.url) {
        console.log('✅ Facebook OAuth URL received:', data.url);

        if (detection.shouldUseNativeApp && detection.isInstalled) {
          console.log('📱 Attempting to open Facebook native app...');
          const opened = openFacebookAppForAuth(data.url);

          if (opened) {
            console.log('✅ Successfully opened Facebook app');
            setTimeout(() => {
              if (document.hidden || (document as any).webkitHidden) {
                console.log('✅ User navigated to Facebook app');
              } else {
                console.log('⚠️ Facebook app might not have opened, falling back to web');
                window.location.href = data.url;
              }
            }, 1500);
          } else {
            console.log('⚠️ Failed to open Facebook app, using web fallback');
            window.location.href = data.url;
          }
        } else {
          console.log('🌐 Using web-based Facebook login');
          window.location.href = data.url;
        }
      } else {
        console.error('❌ No OAuth URL received from Supabase');
        setError('Failed to initiate Facebook login');
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Facebook sign-in exception:', err);
      setError('Failed to sign in with Facebook. Please try again or use phone sign-in.');
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 5) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullPhoneNumber = formatPhoneNumber(selectedCountry.dialCode, phoneNumber);
      const validation = validatePhoneNumber(fullPhoneNumber);

      if (!validation.isValid) {
        setError(validation.error || 'Invalid phone number format');
        setLoading(false);
        return;
      }

      const formattedPhone = validation.formatted || fullPhoneNumber;
      console.log('Sending OTP via Supabase Auth to:', formattedPhone);

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms',
        }
      });

      if (error) {
        console.error('Supabase OTP error:', error);
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          setError('Too many SMS requests. Please wait a few minutes and try again.');
        } else if (error.message.includes('SMS') || error.message.includes('provider')) {
          setError('SMS service temporarily unavailable. Please try again in a few moments.');
        } else {
          setError(error.message || 'Failed to send verification code');
        }
      } else {
        console.log('OTP sent successfully via Supabase Auth');
        if (onOTPRequired) {
          onOTPRequired(formattedPhone);
        } else {
          setSuccess('Verification code sent! Please check your phone.');
        }
      }
    } catch (err) {
      console.error('Phone sign-in error:', err);
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-md px-5 pb-[20px] -mt-12">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-4xl font-bold text-orange-400 mb-2">Hi welcome Gaurav</h1>
          <p className="text-gray-600">Join Pawa with your account</p>
        </div>

        {/* Social Sign-In Buttons */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-gray-700 font-medium">Sign-in with Google</span>
          </button>

          <button
            type="button"
            onClick={handleFacebookSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-gray-700 font-medium">Sign-in with Facebook</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-600 text-sm font-medium">Or sign in with</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Phone Number Input */}
        <form onSubmit={handlePhoneSignIn} className="space-y-4 mb-6">
          <div className="flex gap-3">
            {/* Country Code Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowCountryPicker(true);
                  setCountrySearchQuery('');
                }}
                className="bg-white rounded-xl px-3 py-3.5 shadow-sm border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors min-w-[80px]"
              >
                <span className="text-base font-medium text-gray-700">
                  {selectedCountry.code}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Mobile Number Input */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
              <div className="flex items-center pl-4 pr-0 py-3.5">
                <span className="text-gray-500 font-medium mr-1.5 flex-shrink-0">{selectedCountry.dialCode}</span>
                <input
                  type="tel"
                  placeholder="612345678"
                  value={phoneNumber}
                  onChange={(e) => {
                    let digits = e.target.value.replace(/\D/g, '');

                    // Remove leading zeros immediately
                    digits = digits.replace(/^0+/, '');

                    // Auto-detect and strip duplicate country code
                    const countryCodeDigits = selectedCountry.dialCode.substring(1);
                    if (digits.startsWith(countryCodeDigits)) {
                      const withoutDupe = digits.substring(countryCodeDigits.length);
                      if (withoutDupe.length >= 8 && withoutDupe.length <= 9) {
                        digits = withoutDupe;
                      }
                    }

                    // Limit to 9 digits (without leading 0)
                    if (digits.length <= 9) {
                      setPhoneNumber(digits);
                    }
                  }}
                  maxLength={9}
                  className="flex-1 outline-none text-gray-800 text-base font-medium pr-9"
                />
              </div>
              {phoneNumber && phoneNumber.length >= 8 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-600 text-sm flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !phoneNumber || !agreedToTerms}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-2xl font-semibold hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Sending code...' : 'Continue with mobile'}
          </button>
        </form>

        {/* Terms and Privacy */}
        <div className="fixed bottom-5 left-0 right-0 px-5">
          <div className="w-full max-w-md mx-auto flex items-center justify-center gap-3">
            <p className="text-sm text-gray-600">
              I agree to the{' '}
              <span
                className="text-orange-400 font-medium cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('https://pawatasty.com/terms-conditions/', '_blank');
                }}
              >
                Terms
              </span>{' '}
              &{' '}
              <span
                className="text-orange-400 font-medium cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('https://pawatasty.com/privacy-policy/', '_blank');
                }}
              >
                Privacy Policy
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                if (agreedToTerms) {
                  setShowTermsModal(true);
                } else {
                  setAgreedToTerms(true);
                }
              }}
              className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${
                agreedToTerms ? 'bg-orange-400' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                  agreedToTerms ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

      </div>

      {/* Country Picker Modal */}
      {showCountryPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowCountryPicker(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-md pb-6"
            style={{ transform: 'translateY(0px)', transition: 'transform 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex items-center justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Search and Cancel */}
            <div className="px-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl outline-none text-gray-700"
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowCountryPicker(false)}
                  className="ml-3 text-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>

              {/* Country List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryPicker(false);
                      setCountrySearchQuery('');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none" role="img" aria-label={country.name}>
                        {country.flag}
                      </span>
                      <span className="text-gray-700 font-medium">{country.dialCode}</span>
                      <span className="text-gray-600">{country.name}</span>
                    </div>
                    {selectedCountry.code === country.code && (
                      <Check className="w-5 h-5 text-orange-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl max-w-md w-full animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-3 pb-2">
              <div
                onClick={() => setShowTermsModal(false)}
                className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto cursor-pointer active:cursor-grabbing"
              />
            </div>

            <div className="px-8 py-8 flex flex-col items-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Terms & Privacy</h2>

              <p className="text-center text-gray-700 text-base leading-relaxed mb-8 px-2">
                Our policy explains how we collect, handle, and process your data. By continuing, you agree to it.
              </p>

              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-4 rounded-[1rem] transition-all"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
