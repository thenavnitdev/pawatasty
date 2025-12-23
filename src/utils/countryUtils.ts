export interface CountryMapping {
  code: string;
  name: string;
  dialCode: string;
}

export const countryMappings: CountryMapping[] = [
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
  { code: 'IS', name: 'Iceland', dialCode: '+354' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
  { code: 'MC', name: 'Monaco', dialCode: '+377' },
  { code: 'SM', name: 'San Marino', dialCode: '+378' },
  { code: 'VA', name: 'Vatican City', dialCode: '+379' },
  { code: 'AD', name: 'Andorra', dialCode: '+376' },
];

export function getCountryFromDialCode(dialCode: string): string | null {
  const normalizedDialCode = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;

  const country = countryMappings.find(c =>
    normalizedDialCode.startsWith(c.dialCode)
  );

  return country ? country.name : null;
}

export function getCountryFromPhoneNumber(phoneNumber: string): CountryMapping | null {
  if (!phoneNumber) return null;

  const cleanedNumber = phoneNumber.replace(/[\s()-]/g, '');

  if (!cleanedNumber.startsWith('+')) {
    return null;
  }

  const sortedMappings = [...countryMappings].sort((a, b) =>
    b.dialCode.length - a.dialCode.length
  );

  for (const mapping of sortedMappings) {
    if (cleanedNumber.startsWith(mapping.dialCode)) {
      return mapping;
    }
  }

  return null;
}

export const SEPA_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  'CH', 'MC', 'SM', 'AD', 'VA', 'GB'
];

export function isSEPACountry(countryCode: string): boolean {
  return SEPA_COUNTRIES.includes(countryCode);
}

export function isBelgium(countryCode: string): boolean {
  return countryCode === 'BE';
}
