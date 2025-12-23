import { useState, useRef } from 'react';
import { Search, Check, AlertCircle } from 'lucide-react';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/phoneValidation';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const countries: Country[] = [
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

interface PhoneNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phoneNumber: string, countryCode: string) => void;
  initialPhone?: string;
  initialCountryCode?: string;
}

export default function PhoneNumberModal({
  isOpen,
  onClose,
  onSubmit,
  initialPhone = '',
  initialCountryCode = '+31',
}: PhoneNumberModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.dialCode === initialCountryCode) || countries[0]
  );

  // Clean initial phone value to remove duplicate country codes and leading zeros
  const cleanInitialPhone = () => {
    if (!initialPhone) return '';

    let cleaned = initialPhone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, ''); // Remove leading zeros

    // Check if initial value contains duplicate country code
    const countryDigits = initialCountryCode.substring(1);

    // Keep removing duplicate country codes until we have a valid length
    while (cleaned.startsWith(countryDigits) && cleaned.length > 9) {
      const withoutDupe = cleaned.substring(countryDigits.length);
      // Only strip if the remaining part could be a valid local number
      if (withoutDupe.length >= 8 && withoutDupe.length <= 11) {
        cleaned = withoutDupe;
      } else {
        break;
      }
    }

    // Limit to 9 digits
    return cleaned.substring(0, 9);
  };

  const [phoneNumber, setPhoneNumber] = useState(cleanInitialPhone());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery)
  );

  const handlePhoneChange = (value: string) => {
    // Check if user pasted a number with country code (starts with +)
    if (value.trim().startsWith('+')) {
      // Parse the full number to extract country code and local number
      const cleaned = value.replace(/[\s\-()]/g, '');

      // Try to match against known country codes
      const matchedCountry = countries.find(c => cleaned.startsWith(c.dialCode));
      if (matchedCountry) {
        // Extract local number (everything after the dial code)
        const localNumber = cleaned.substring(matchedCountry.dialCode.length);
        setSelectedCountry(matchedCountry);
        setPhoneNumber(localNumber.replace(/\D/g, '').replace(/^0+/, ''));
        setValidationError(null);
        return;
      }
    }

    // Only allow digits for normal input
    let digitsOnly = value.replace(/\D/g, '');

    // Remove leading zeros immediately (Dutch users often type 0612345678)
    digitsOnly = digitsOnly.replace(/^0+/, '');

    // Auto-detect and strip duplicate country code
    // If user types country code digits (e.g., "31" when +31 is already selected)
    const countryCodeDigits = selectedCountry.dialCode.substring(1); // Remove the +
    if (digitsOnly.startsWith(countryCodeDigits)) {
      // Check if they accidentally included the country code
      // For NL (+31): if they typed "31612345678", strip the "31"
      const withoutDupe = digitsOnly.substring(countryCodeDigits.length);
      // Only strip if the remaining part looks like a valid local number (8-9 digits for NL)
      if (withoutDupe.length >= 8 && withoutDupe.length <= 9) {
        digitsOnly = withoutDupe;
        setValidationError(null);
      }
    }

    // Limit input length based on country (Netherlands: max 9 digits without leading 0)
    const maxLength = selectedCountry.code === 'NL' ? 9 : 15;
    if (digitsOnly.length <= maxLength) {
      setPhoneNumber(digitsOnly);
      setValidationError(null);
    }
  };

  const handleSubmit = () => {
    if (!phoneNumber.trim()) {
      setValidationError('Please enter a phone number');
      return;
    }

    // Check if user entered too many digits (common mistake)
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // For Netherlands, valid is 9 digits (leading 0 is already stripped)
    if (selectedCountry.code === 'NL' && cleanNumber.length > 9) {
      setValidationError('Phone number is too long. Dutch mobile numbers are 9 digits');
      return;
    }

    // Format the complete phone number
    const fullNumber = formatPhoneNumber(selectedCountry.dialCode, phoneNumber);

    // Validate the complete phone number
    const validation = validatePhoneNumber(fullNumber);

    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid phone number');
      return;
    }

    // Submit the validated phone number
    if (phoneNumber.trim()) {
      onSubmit(validation.formatted!, selectedCountry.dialCode);
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-md pb-6"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {!showCountryList ? (
          <div className="px-5">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-4xl">👋</span>
              <h2 className="text-2xl font-bold text-orange-400">Hi welcome</h2>
            </div>

            <p className="text-slate-700 font-medium mb-2">Enter your phone number</p>
            <p className="text-sm text-gray-500 mb-6">
              {selectedCountry.code === 'NL'
                ? 'Enter 9 digits without the country code (e.g., 612345678)'
                : `Format: ${selectedCountry.dialCode} followed by your mobile number`}
            </p>

            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setShowCountryList(true)}
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-orange-300 rounded-2xl hover:border-orange-400 transition-colors"
              >
                <span className="text-2xl">{selectedCountry.flag}</span>
                <span className="text-gray-600 font-medium">{selectedCountry.dialCode}</span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Mobile number"
                className={`flex-1 px-4 py-3 bg-white border-2 rounded-2xl outline-none text-gray-800 font-medium ${
                  validationError ? 'border-red-400 focus:border-red-500' : 'border-orange-300 focus:border-orange-400'
                }`}
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            {validationError && (
              <div className="flex items-start gap-2 mb-6 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{validationError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!phoneNumber.trim()}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-[1rem] font-semibold hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-50 shadow-lg"
            >
              Confirm
            </button>
          </div>
        ) : (
          <div className="px-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl outline-none text-gray-700"
                />
              </div>
              <button
                onClick={() => setShowCountryList(false)}
                className="ml-3 text-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowCountryList(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country.flag}</span>
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
        )}
      </div>
    </div>
  );
}
