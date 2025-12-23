export interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

export interface DetectedCity {
  city: string;
  country: string;
}

export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
};

export const getCityFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<DetectedCity | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'PowerBankApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch city data');
    }

    const data = await response.json();

    if (data.address) {
      const city = data.address.city ||
                   data.address.town ||
                   data.address.village ||
                   data.address.municipality ||
                   data.address.county;

      const country = data.address.country_code?.toUpperCase() ||
                     data.address.country;

      if (city && country) {
        return { city, country };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting city from coordinates:', error);
    return null;
  }
};

export const detectUserCity = async (): Promise<DetectedCity | null> => {
  try {
    const position = await getCurrentPosition();
    const city = await getCityFromCoordinates(position.latitude, position.longitude);
    return city;
  } catch (error) {
    console.error('Error detecting user city:', error);
    return null;
  }
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getNearestAvailableCity = async (
  detectedCity: string | null,
  availableCities: Array<{ name: string; country: string }>
): Promise<string> => {
  if (detectedCity) {
    const matchingCity = availableCities.find(
      (city) => city.name.toLowerCase() === detectedCity.toLowerCase()
    );

    if (matchingCity) {
      return matchingCity.name;
    }
  }

  if (availableCities.length > 0) {
    return availableCities[0].name;
  }

  return 'Amsterdam';
};
