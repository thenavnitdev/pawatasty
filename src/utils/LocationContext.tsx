import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCurrentPosition, detectUserCity } from './geolocation';

interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  accuracy?: number;
}

interface LocationContextType {
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📍 LocationContext: Fetching user location...');

      const position = await getCurrentPosition();
      const detectedCity = await detectUserCity();

      const location: UserLocation = {
        latitude: position.latitude,
        longitude: position.longitude,
        city: detectedCity?.city,
        accuracy: position.accuracy,
      };

      console.log('✅ LocationContext: Location fetched successfully:', location);
      setUserLocation(location);
    } catch (err) {
      console.error('❌ LocationContext: Failed to fetch location:', err);
      setError(err instanceof Error ? err.message : 'Failed to get location');
      setUserLocation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 LocationContext: Initial location fetch');
    fetchLocation();
  }, []);

  const refreshLocation = useCallback(async () => {
    console.log('🔄 LocationContext: Manual location refresh requested');
    await fetchLocation();
  }, [fetchLocation]);

  return (
    <LocationContext.Provider value={{ userLocation, isLoading, error, refreshLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useUserLocation must be used within a LocationProvider');
  }
  return context;
}
