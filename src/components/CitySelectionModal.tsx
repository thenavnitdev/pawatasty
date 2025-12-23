import { X, Check, Navigation } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCurrentPosition, calculateDistance } from '../utils/geolocation';
import { getCachedCities } from '../utils/citiesCache';

interface City {
  name: string;
  country: string;
  dealCount: number;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
}

interface CitySelectionModalProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onClose: () => void;
}

export default function CitySelectionModal({ selectedCity, onSelectCity, onClose }: CitySelectionModalProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    loadCitiesData();
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setUserLocation(position);
    } catch (error) {
      console.log('Could not get user location for sorting');
    }
  };

  const loadCitiesData = async () => {
    try {
      setLoading(true);
      const cachedCities = await getCachedCities();
      setCities(cachedCities);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load cities:', error);
      setLoading(false);
    }
  };

  const normalizeCountryCode = (country: string): string => {
    if (country === 'Netherlands') return 'NL';
    return country;
  };

  const citiesWithDistance = cities.map(city => {
    const normalizedCountry = normalizeCountryCode(city.country);
    if (userLocation && city.latitude && city.longitude) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        city.latitude,
        city.longitude
      );
      return { ...city, country: normalizedCountry, distance };
    }
    return { ...city, country: normalizedCountry, distance: undefined };
  });

  const sortedCities = [...citiesWithDistance].sort((a, b) => {
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    if (a.distance !== undefined) return -1;
    if (b.distance !== undefined) return 1;

    if (a.country !== b.country) {
      return a.country.localeCompare(b.country);
    }
    return a.name.localeCompare(b.name);
  });

  const groupedCities = sortedCities.reduce((acc, city) => {
    const country = city.country;
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(city);
    return acc;
  }, {} as Record<string, City[]>);

  // Determine user's current country based on closest city
  const userCountry = userLocation && sortedCities.length > 0 && sortedCities[0].distance !== undefined
    ? sortedCities[0].country
    : null;

  // Sort countries to prioritize user's current country
  const sortedCountries = Object.keys(groupedCities).sort((a, b) => {
    if (userCountry) {
      if (a === userCountry) return -1;
      if (b === userCountry) return 1;
    }
    return a.localeCompare(b);
  });

  const countryNames: Record<string, string> = {
    'NL': 'THE NETHERLANDS',
    'DE': 'GERMANY',
    'FR': 'FRANCE',
    'ES': 'SPAIN',
    'AT': 'AUSTRIA',
  };

  const countryFlags: Record<string, string> = {
    'NL': '🇳🇱',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'ES': '🇪🇸',
    'AT': '🇦🇹',
  };

  const handleCitySelect = (cityName: string) => {
    onSelectCity(cityName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-slate-900">Cities</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Navigation className="w-4 h-4" />
              <span>Sorted by proximity to your location</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="pb-8">
              {sortedCountries.map((countryCode) => (
                <div key={countryCode}>
                  <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{countryFlags[countryCode] || '🏳️'}</span>
                      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                        {countryNames[countryCode] || countryCode}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {groupedCities[countryCode].map((city) => {
                      const isSelected = city.name.toLowerCase() === selectedCity.toLowerCase();

                      return (
                        <button
                          key={`${countryCode}-${city.name}`}
                          onClick={() => handleCitySelect(city.name)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {isSelected && (
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <Check className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className={`text-lg font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                {city.name}
                              </span>
                              {city.distance !== undefined && (
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                  <Navigation className="w-3 h-3" />
                                  <span>{city.distance < 1 ? '<1' : Math.round(city.distance)} km away</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-base text-slate-500 font-normal">
                            {city.dealCount} {city.dealCount === 1 ? 'Deal' : 'Deals'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
