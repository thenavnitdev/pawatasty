interface City {
  name: string;
  country: string;
  dealCount: number;
  latitude?: number | null;
  longitude?: number | null;
}

interface CachedData {
  cities: City[];
  timestamp: number;
}

const CACHE_KEY = 'cities_cache';
const CACHE_DURATION = 5 * 60 * 1000;

let memoryCache: CachedData | null = null;

export async function getCachedCities(): Promise<City[]> {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
    console.log('📦 Returning cities from memory cache');
    return memoryCache.cities;
  }

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed: CachedData = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        console.log('📦 Returning cities from localStorage cache');
        memoryCache = parsed;
        return parsed.cities;
      }
    }
  } catch (error) {
    console.error('Error reading cities cache:', error);
  }

  console.log('🌐 Fetching fresh cities data');
  const cities = await fetchCitiesFromAPI();
  setCitiesCache(cities);
  return cities;
}

export function setCitiesCache(cities: City[]): void {
  const cacheData: CachedData = {
    cities,
    timestamp: Date.now(),
  };

  memoryCache = cacheData;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting cities cache:', error);
  }
}

export function clearCitiesCache(): void {
  memoryCache = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cities cache:', error);
  }
}

async function fetchCitiesFromAPI(): Promise<City[]> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cities`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.cities || [];
    }

    console.error('Failed to fetch cities:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}
