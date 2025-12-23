export interface CityMapping {
  normalized: string;
  country: string;
  variations: string[];
}

const cityMappings: CityMapping[] = [
  {
    normalized: 'Den Haag',
    country: 'NL',
    variations: [
      's-gravenhage',
      "'s-gravenhage",
      'S-GRAVENHAGE',
      "'S-GRAVENHAGE",
      'den haag',
      'Den haag',
      'Den Haag',
      'the hague',
      'The Hague',
    ],
  },
];

export const normalizeCityName = (cityName: string | null | undefined, country?: string): string => {
  if (!cityName) return '';

  const trimmedCity = cityName.trim();
  const lowerCity = trimmedCity.toLowerCase();

  for (const mapping of cityMappings) {
    if (country && mapping.country !== country) continue;

    for (const variation of mapping.variations) {
      if (variation.toLowerCase() === lowerCity) {
        return mapping.normalized;
      }
    }
  }

  return trimmedCity.charAt(0).toUpperCase() + trimmedCity.slice(1);
};

export const getCityKey = (cityName: string, country: string): string => {
  const normalized = normalizeCityName(cityName, country);
  return `${normalized.toLowerCase()}-${country}`;
};

export const areSameCities = (city1: string, country1: string, city2: string, country2: string): boolean => {
  if (country1 !== country2) return false;
  return getCityKey(city1, country1) === getCityKey(city2, country2);
};
