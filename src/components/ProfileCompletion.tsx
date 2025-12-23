import { useState, useEffect, useCallback, useRef } from 'react';
import { profileEdgeAPI } from '../services/mobile/profileEdge';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft } from 'lucide-react';
import PhoneNumberModal from './PhoneNumberModal';
import SaveConfirmation from './SaveConfirmation';
import { getCountryFromPhoneNumber } from '../utils/countryUtils';
import { validatePhoneNumber } from '../utils/phoneValidation';

interface ProfileCompletionProps {
  user: any;
  onComplete: () => void;
  prefilledPhone?: string;
  onBack?: () => void;
}

type SignupMethod = 'phone' | 'google' | 'facebook';

export default function ProfileCompletion({ user, onComplete, prefilledPhone, onBack }: ProfileCompletionProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+31');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('phone');
  const completionCalledRef = useRef(false);

  useEffect(() => {
    // Detect signup method
    const provider = user?.app_metadata?.provider;
    const detectedMethod: SignupMethod = provider === 'google' ? 'google' :
                                         provider === 'facebook' ? 'facebook' :
                                         'phone';
    setSignupMethod(detectedMethod);
    console.log('Profile completion mode:', detectedMethod);

    // Pre-fill data based on signup method
    if (detectedMethod === 'google' || detectedMethod === 'facebook') {
      // OAuth: auto-capture name and email
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const userEmail = user.email || user.user_metadata?.email || '';
      setFullName(userName);
      setEmail(userEmail);
    } else if (detectedMethod === 'phone') {
      // Phone signup: pre-fill phone number
      const userPhone = user.phone || prefilledPhone || '';

      // Clean the phone number before setting it
      let cleanedPhone = userPhone;
      if (cleanedPhone) {
        // Remove all non-digits
        cleanedPhone = cleanedPhone.replace(/\D/g, '');
        // Remove leading zeros
        cleanedPhone = cleanedPhone.replace(/^0+/, '');

        // Detect country first to get the dial code
        const detectedCountry = getCountryFromPhoneNumber(userPhone);
        if (detectedCountry) {
          setCountryCode(detectedCountry.dialCode);

          // Remove duplicate country codes (iteratively handle cases like 3131684408583)
          const countryDigits = detectedCountry.dialCode.substring(1);
          while (cleanedPhone.startsWith(countryDigits) && cleanedPhone.length > 9) {
            const withoutDupe = cleanedPhone.substring(countryDigits.length);
            // Only strip if remaining looks like valid local number or another duplicate
            if (withoutDupe.length >= 8) {
              cleanedPhone = withoutDupe;
            } else {
              break;
            }
          }

          // Final trim to 9 digits max
          cleanedPhone = cleanedPhone.substring(0, 9);
        }
      }

      setPhoneNumber(cleanedPhone);
    }
  }, [user, prefilledPhone]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  // Email verification is handled by Supabase when email confirmation is enabled
  // We removed the manual trigger to prevent auth state change loops during profile completion

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Try to refresh the session before submitting
    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !session) {
        console.warn('Could not refresh session:', refreshError);
      } else {
        console.log('✅ Session refreshed successfully');
      }
    } catch (err) {
      console.warn('Session refresh failed:', err);
    }

    // Validate based on signup method
    if (signupMethod === 'phone') {
      // Phone signup: needs name and email
      if (!fullName.trim()) {
        setError('Please enter your full name');
        return;
      }
      const nameParts = fullName.trim().split(' ');
      if (nameParts.length < 2) {
        setError('Please enter both first and last name');
        return;
      }
      if (!email.trim()) {
        setError('Please enter your email address');
        return;
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address');
        return;
      }
    } else if (signupMethod === 'google' || signupMethod === 'facebook') {
      // OAuth: needs phone number
      if (!phoneNumber.trim()) {
        setError('Please enter your phone number');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Clean and format phone number
      let formattedPhone = phoneNumber.trim();

      if (formattedPhone) {
        // Remove all whitespace
        formattedPhone = formattedPhone.replace(/\s+/g, '');

        // If it doesn't start with +, add the country code
        if (!formattedPhone.startsWith('+')) {
          // Remove leading zeros (common in local formats)
          formattedPhone = formattedPhone.replace(/^0+/, '');

          // Remove duplicate country code if present (e.g., user has "31684408583" and countryCode is "+31")
          const countryDigits = countryCode.substring(1); // Remove the + from countryCode
          if (formattedPhone.startsWith(countryDigits)) {
            const withoutDupe = formattedPhone.substring(countryDigits.length);
            // Only strip if remaining looks like valid local number (8-9 digits for NL)
            if (withoutDupe.length >= 8 && withoutDupe.length <= 9) {
              formattedPhone = withoutDupe;
            }
          }

          formattedPhone = `${countryCode}${formattedPhone}`;
        }

        // Validate the formatted phone number
        const validation = validatePhoneNumber(formattedPhone);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid phone number format');
          return;
        }
        formattedPhone = validation.formatted!;
      }

      // Detect country from phone number
      const detectedCountry = getCountryFromPhoneNumber(formattedPhone);

      // Get current Supabase user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        console.error('Authentication error:', authError);
        setError('Session expired. Please log in again.');
        // Clear any stored session data
        await supabase.auth.signOut();
        // Wait a moment for user to see the error, then reload to trigger login
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      // ALWAYS update Supabase first (this is the source of truth for profile completion)
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id, email')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const userData: any = {
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Add fields based on what's provided
      if (fullName.trim()) {
        userData.full_name = fullName.trim();
        // Always split name into first_name and last_name for consistency
        const nameParts = fullName.trim().split(' ');
        userData.first_name = nameParts[0] || '';
        userData.last_name = nameParts.slice(1).join(' ') || '';
      }

      // Only update email if it's different from the existing one
      if (email.trim()) {
        const newEmail = email.trim().toLowerCase();
        const existingEmail = existingUser?.email?.toLowerCase();

        if (newEmail !== existingEmail) {
          // Check if email is already used by another user
          const { data: emailCheck } = await supabase
            .from('users')
            .select('user_id')
            .ilike('email', newEmail)
            .neq('user_id', currentUser.id)
            .maybeSingle();

          if (emailCheck) {
            throw new Error('That email is already registered. Please use a different one.');
          }

          userData.email = email.trim();
        }
      }
      if (formattedPhone) {
        userData.phone_nr = formattedPhone;
        userData.country = detectedCountry?.name || null;
      }

      if (existingUser) {
        // Update existing record
        console.log('✅ Updating existing user profile');
        console.log('📝 Update data:', JSON.stringify(userData, null, 2));
        const { error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('user_id', currentUser.id);

        if (updateError) {
          console.error('Supabase update error details:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          });
          // Check if it's a duplicate email error
          if (updateError.code === '23505' || updateError.message.includes('duplicate key') || updateError.message.includes('idx_users_email_unique_lower')) {
            throw new Error('That email is already registered. Please use a different one.');
          }
          throw new Error(`Database update failed: ${updateError.message}`);
        }
        console.log('✅ User profile updated successfully in database');
      } else {
        // Insert new record
        console.log('➕ Creating new user profile');
        console.log('📝 Insert data:', JSON.stringify({
          user_id: currentUser.id,
          email: currentUser.email,
          ...userData,
        }, null, 2));
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            user_id: currentUser.id,
            email: currentUser.email,
            created_at: new Date().toISOString(),
            ...userData,
          });

        if (insertError) {
          console.error('Supabase insert error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
          });
          // Check if it's a duplicate email error
          if (insertError.code === '23505' || insertError.message.includes('duplicate key') || insertError.message.includes('idx_users_email_unique_lower')) {
            throw new Error('That email is already registered. Please use a different one.');
          }
          throw new Error(`Database insert failed: ${insertError.message}`);
        }
        console.log('✅ User profile created successfully in database');
      }

      // Verify the data was actually saved
      const { data: verifyData } = await supabase
        .from('users')
        .select('user_id, full_name, first_name, last_name, email, phone_nr, country, profile_completed, created_at, updated_at')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      console.log('🔍 Verification - Data saved to database:', JSON.stringify(verifyData, null, 2));

      // Note: Email verification is handled by Supabase automatically when email confirmation is enabled
      // We don't need to manually trigger it here to avoid auth state change loops

      // Also try to update via edge function (best effort, don't fail if it errors)
      try {
        const profileUpdate: any = {};

        if (fullName.trim()) {
          profileUpdate.firstName = fullName.trim().split(' ')[0];
          profileUpdate.lastName = fullName.trim().split(' ').slice(1).join(' ');
        }
        if (formattedPhone) {
          profileUpdate.phoneNumber = formattedPhone;
          profileUpdate.country = detectedCountry?.name || undefined;
        }
        if (email.trim()) {
          profileUpdate.email = email.trim();
        }

        await profileEdgeAPI.updateProfile(profileUpdate);
      } catch (apiError) {
        console.log('Edge function update failed (non-critical):', apiError);
      }

      setShowSaveConfirmation(true);

      // Only call onComplete once to prevent reload loop
      if (!completionCalledRef.current) {
        completionCalledRef.current = true;
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const displayName = fullName.toUpperCase() || 'YOUR NAME';

  return (
    <div className="fixed inset-0 bg-white flex items-start justify-center overflow-hidden pt-12">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-6 left-5 z-10 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
      )}

      <div className="w-full max-w-md px-5 pb-[30px] relative" style={{ minHeight: 'calc(100vh - 3rem)' }}>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-4">
          Complete your profile
        </h1>

        {signupMethod === 'phone' && (
          <p className="text-sm text-gray-600 text-center mb-8 hidden">
            Please provide your name and email address to complete your profile.
          </p>
        )}
        {(signupMethod === 'google' || signupMethod === 'facebook') && (
          <p className="text-sm text-gray-600 text-center mb-8 hidden">
            We've captured your name and email. Please add your phone number to complete your profile.
          </p>
        )}
        {signupMethod === 'email' && (
          <p className="text-sm text-gray-600 text-center mb-8 hidden">
            Please provide your name and phone number to complete your profile.
          </p>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center mb-4 shadow-lg">
            <div className="text-4xl">😎</div>
          </div>
          <h2 className="text-2xl font-bold text-orange-400 tracking-wide">
            {displayName}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show name field for phone and email signup */}
          {(signupMethod === 'phone' || signupMethod === 'email') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-xl outline-none focus:border-orange-400 text-gray-800 font-medium"
                  placeholder="Enter your name"
                  required
                />
                {fullName && (
                  <button
                    type="button"
                    onClick={() => setFullName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Show email field for phone signup */}
          {signupMethod === 'phone' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-xl outline-none focus:border-orange-400 text-gray-800 font-medium"
                  placeholder="Enter your email address"
                  required
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Show phone field for email and OAuth signup */}
          {(signupMethod === 'email' || signupMethod === 'google' || signupMethod === 'facebook') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(true)}
                className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                  phoneNumber
                    ? 'bg-orange-50 text-gray-800 hover:bg-orange-100'
                    : 'bg-white border-2 border-orange-300 text-gray-400 hover:border-orange-400'
                }`}
              >
                {phoneNumber || 'Add your phone number'}
              </button>
            </div>
          )}

          {/* Show read-only phone for phone signup */}
          {signupMethod === 'phone' && phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                disabled
                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-500 font-medium cursor-not-allowed"
              />
            </div>
          )}

          {/* Show read-only email for OAuth signup */}
          {(signupMethod === 'google' || signupMethod === 'facebook') && email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-500 font-medium cursor-not-allowed"
              />
            </div>
          )}

          {/* Show read-only name for OAuth signup */}
          {(signupMethod === 'google' || signupMethod === 'facebook') && fullName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={fullName}
                disabled
                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-500 font-medium cursor-not-allowed"
              />
            </div>
          )}

          <PhoneNumberModal
            isOpen={isPhoneModalOpen}
            onClose={() => setIsPhoneModalOpen(false)}
            onSubmit={(phone, code) => {
              setPhoneNumber(phone);
              setCountryCode(code);
            }}
            initialPhone={phoneNumber.replace(countryCode, '').trim()}
            initialCountryCode={countryCode}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="fixed bottom-[30px] left-0 right-0 px-5 max-w-md mx-auto">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-[1rem] font-semibold hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </form>
      </div>

      <SaveConfirmation
        isVisible={showSaveConfirmation}
        onHide={() => setShowSaveConfirmation(false)}
      />
    </div>
  );
}
