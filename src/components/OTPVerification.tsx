import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import OTPErrorModal from './OTPErrorModal';
import NumericCodeInput from './NumericCodeInput';

interface OTPVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OTPVerification({ phoneNumber, onVerified, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (newOtp: string[]) => {
    setOtp(newOtp);

    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);

    try {
      console.log('Verifying OTP via Supabase Auth for:', phoneNumber);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms'
      });

      if (error || !data.session) {
        console.error('OTP verification error:', error);
        setShowErrorModal(true);
        setOtp(['', '', '', '', '', '']);
      } else {
        console.log('✅ OTP verified successfully via Supabase Auth');

        if (data.session && data.user) {
          console.log('📝 Creating/updating user profile in database');

          const { data: existingUser } = await supabase
            .from('users')
            .select('id, user_id, email, phone_nr, full_name, profile_completed')
            .eq('phone_nr', phoneNumber)
            .maybeSingle();

          if (!existingUser) {
            const phoneEmail = phoneNumber.replace(/[^0-9]/g, '') + '@phone.pawatasty.com';

            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                user_id: data.user.id,
                phone_nr: phoneNumber,
                email: phoneEmail,
                profile_completed: false,
              })
              .select()
              .single();

            if (insertError) {
              console.error('Failed to create user profile:', insertError);
            } else {
              console.log('✅ User profile created:', newUser?.id);
            }
          } else {
            console.log('✅ Existing user profile found:', existingUser.id);
          }
        }

        onVerified();
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setShowErrorModal(true);
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);

    try {
      console.log('Resending OTP via Supabase Auth to:', phoneNumber);

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          channel: 'sms',
        }
      });

      if (error) {
        console.error('Resend OTP error:', error);
        setShowErrorModal(true);
      } else {
        console.log('OTP resent successfully');
        setTimeLeft(180);
        setOtp(['', '', '', '', '', '']);
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 3) return phone;
    const countryCode = cleaned.slice(0, cleaned.length - 9);
    const lastDigits = cleaned.slice(-9);
    const masked = lastDigits.slice(0, -2).replace(/\d/g, '*');
    const visible = lastDigits.slice(-2);
    return `+${countryCode} ${masked}${visible}`;
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-md mx-auto px-5 py-6">
          <button
            onClick={onBack}
            className="mb-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">OTP Verification</h1>
          </div>

          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <NumericCodeInput
                value={otp}
                onChange={handleOtpChange}
                disabled={loading}
                autoFocus={true}
              />
            </div>

            <div className="text-center mb-6">
              <p className="text-gray-600 mb-1">Enter the verification code sent to:</p>
              <p className="text-orange-400 font-semibold">{formatPhoneNumber(phoneNumber)}</p>
            </div>

            <div className="text-center mb-8">
              <p className="text-2xl font-bold text-gray-900">{formatTime(timeLeft)}</p>
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-2">Don't get the code?</p>
              <button
                onClick={handleResend}
                disabled={loading || timeLeft > 0}
                className="text-orange-400 font-semibold hover:text-orange-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Resend
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center text-gray-600">
              <p>Verifying...</p>
            </div>
          )}
        </div>
      </div>

      <OTPErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  );
}
