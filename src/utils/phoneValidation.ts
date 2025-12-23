/**
 * Phone Number Validation Utility
 * Validates phone numbers according to E.164 international standard
 *
 * Format: +[country code][mobile number]
 * Examples:
 * ✅ +31684408111 (Netherlands)
 * ✅ +14155552671 (US)
 * ✅ +447911123456 (UK)
 * ❌ +3131 (too short)
 * ❌ +3131684408111 (invalid structure)
 */

interface CountryPhoneRule {
  code: string;
  name: string;
  dialCode: string;
  minDigits: number; // minimum digits (excluding +)
  maxDigits: number; // maximum digits (excluding +)
  pattern?: RegExp; // optional pattern for specific validation
}

// E.164 phone number rules by country
// minDigits and maxDigits refer to TOTAL digits after the + sign
const COUNTRY_PHONE_RULES: CountryPhoneRule[] = [
  { code: 'NL', name: 'Netherlands', dialCode: '+31', minDigits: 11, maxDigits: 11 }, // +31612345678 = 11 total digits
  { code: 'US', name: 'United States', dialCode: '+1', minDigits: 11, maxDigits: 11 }, // +14155551234 = 11 total digits
  { code: 'CA', name: 'Canada', dialCode: '+1', minDigits: 11, maxDigits: 11 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', minDigits: 12, maxDigits: 13 }, // +447911123456 = 12-13 digits
  { code: 'IT', name: 'Italy', dialCode: '+39', minDigits: 11, maxDigits: 13 }, // +39312345678 = 11-13 digits
  { code: 'BE', name: 'Belgium', dialCode: '+32', minDigits: 11, maxDigits: 11 }, // +32412345678 = 11 digits
  { code: 'FR', name: 'France', dialCode: '+33', minDigits: 11, maxDigits: 11 }, // +33612345678 = 11 digits
  { code: 'DE', name: 'Germany', dialCode: '+49', minDigits: 11, maxDigits: 13 }, // +491512345678 = 12-13 digits
  { code: 'ES', name: 'Spain', dialCode: '+34', minDigits: 11, maxDigits: 11 }, // +34612345678 = 11 digits
  { code: 'PT', name: 'Portugal', dialCode: '+351', minDigits: 12, maxDigits: 12 }, // +351912345678 = 12 digits
  { code: 'PL', name: 'Poland', dialCode: '+48', minDigits: 11, maxDigits: 11 }, // +48512345678 = 11 digits
  { code: 'AT', name: 'Austria', dialCode: '+43', minDigits: 11, maxDigits: 13 }, // +43650123456 = 11-13 digits
  { code: 'CH', name: 'Switzerland', dialCode: '+41', minDigits: 11, maxDigits: 11 }, // +41791234567 = 11 digits
  { code: 'SE', name: 'Sweden', dialCode: '+46', minDigits: 11, maxDigits: 12 }, // +46701234567 = 11-12 digits
  { code: 'NO', name: 'Norway', dialCode: '+47', minDigits: 10, maxDigits: 10 }, // +4741234567 = 10 digits
  { code: 'DK', name: 'Denmark', dialCode: '+45', minDigits: 10, maxDigits: 10 }, // +4541234567 = 10 digits
  { code: 'FI', name: 'Finland', dialCode: '+358', minDigits: 11, maxDigits: 12 }, // +358401234567 = 12 digits
  { code: 'IE', name: 'Ireland', dialCode: '+353', minDigits: 11, maxDigits: 12 }, // +353851234567 = 12 digits
  { code: 'GR', name: 'Greece', dialCode: '+30', minDigits: 12, maxDigits: 12 }, // +306912345678 = 12 digits
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', minDigits: 12, maxDigits: 12 }, // +420601123456 = 12 digits
  { code: 'HU', name: 'Hungary', dialCode: '+36', minDigits: 10, maxDigits: 11 }, // +36201234567 = 11 digits
  { code: 'AU', name: 'Australia', dialCode: '+61', minDigits: 11, maxDigits: 11 }, // +61412345678 = 11 digits
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', minDigits: 10, maxDigits: 11 }, // +6421234567 = 10-11 digits
];

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
  country?: string;
  dialCode?: string;
}

/**
 * Validates a phone number according to E.164 standard
 */
export function validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
  // Remove all whitespace, dashes, parentheses
  const cleaned = phoneNumber.replace(/[\s\-()]/g, '');

  // Check if it starts with +
  if (!cleaned.startsWith('+')) {
    return {
      isValid: false,
      error: 'Phone number must start with + followed by country code (e.g., +31 for Netherlands)',
    };
  }

  // Check if it contains only + and digits
  if (!/^\+\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Phone number must contain only digits after the + sign',
    };
  }

  // Minimum length check (shortest valid number is about 8 digits total)
  if (cleaned.length < 8) {
    return {
      isValid: false,
      error: 'Phone number is too short',
    };
  }

  // Maximum length check (E.164 allows max 15 digits including country code)
  if (cleaned.length > 16) { // +15 digits
    return {
      isValid: false,
      error: 'Number is too long. Please enter only your phone number without the country code',
    };
  }

  // Sort rules by dial code length (longest first) to match most specific first
  const sortedRules = [...COUNTRY_PHONE_RULES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  // Find matching country rule
  for (const rule of sortedRules) {
    if (cleaned.startsWith(rule.dialCode)) {
      // Count only digits (exclude the + sign)
      const digitCount = cleaned.substring(1).length;

      // Validate length for this specific country
      if (digitCount < rule.minDigits) {
        return {
          isValid: false,
          error: `Phone number for ${rule.name} is too short (minimum ${rule.minDigits} digits)`,
        };
      }

      if (digitCount > rule.maxDigits) {
        return {
          isValid: false,
          error: `Number is too long. Enter only your phone number without the country code`,
        };
      }

      // Additional pattern validation if specified
      if (rule.pattern && !rule.pattern.test(cleaned)) {
        return {
          isValid: false,
          error: `Invalid phone number format for ${rule.name}`,
        };
      }

      // Valid!
      return {
        isValid: true,
        formatted: cleaned,
        country: rule.name,
        dialCode: rule.dialCode,
      };
    }
  }

  // If no specific rule found but format is generally valid
  // (starts with +, has reasonable length, only digits)
  return {
    isValid: true,
    formatted: cleaned,
    error: undefined,
  };
}

/**
 * Formats a phone number by combining country code and local number
 */
export function formatPhoneNumber(dialCode: string, localNumber: string): string {
  // Clean local number: remove spaces, dashes, and leading zeros
  let cleanLocal = localNumber.replace(/[\s\-()]/g, '');
  cleanLocal = cleanLocal.replace(/^0+/, '');

  // Keep only digits from local number
  const cleanLocalDigits = cleanLocal.replace(/\D/g, '');

  // Clean dial code but preserve the + sign
  let cleanDialCode = dialCode.trim();
  if (!cleanDialCode.startsWith('+')) {
    cleanDialCode = '+' + cleanDialCode.replace(/\D/g, '');
  } else {
    // Remove everything except + and digits
    cleanDialCode = '+' + cleanDialCode.substring(1).replace(/\D/g, '');
  }

  return `${cleanDialCode}${cleanLocalDigits}`;
}

/**
 * Extracts dial code and local number from full phone number
 */
export function parsePhoneNumber(phoneNumber: string): { dialCode: string; localNumber: string } | null {
  const cleaned = phoneNumber.replace(/[\s\-()]/g, '');

  if (!cleaned.startsWith('+')) {
    return null;
  }

  // Sort rules by dial code length (longest first)
  const sortedRules = [...COUNTRY_PHONE_RULES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const rule of sortedRules) {
    if (cleaned.startsWith(rule.dialCode)) {
      return {
        dialCode: rule.dialCode,
        localNumber: cleaned.substring(rule.dialCode.length),
      };
    }
  }

  // Fallback: assume country code is 1-4 digits
  const match = cleaned.match(/^(\+\d{1,4})(.+)$/);
  if (match) {
    return {
      dialCode: match[1],
      localNumber: match[2],
    };
  }

  return null;
}

/**
 * Get validation error message for display
 */
export function getPhoneValidationError(phoneNumber: string): string | null {
  const result = validatePhoneNumber(phoneNumber);
  return result.error || null;
}

/**
 * Check if phone number is valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  return validatePhoneNumber(phoneNumber).isValid;
}

// Examples for documentation
export const PHONE_NUMBER_EXAMPLES = {
  valid: [
    '+31684408111', // Netherlands
    '+14155552671', // US
    '+447911123456', // UK
    '+33612345678', // France
    '+4915123456789', // Germany
  ],
  invalid: [
    '+3131', // Too short
    '+3131684408111', // Invalid structure (duplicate country code)
    '31684408111', // Missing +
    '+31 0684408111', // Leading zero in local number
    '+316844081111111', // Too long
  ],
};
