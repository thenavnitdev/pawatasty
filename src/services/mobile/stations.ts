import { apiClient } from './client';

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSlots: number;
  availableSlots: number;
  powerbankCapacity?: number;
  status: 'active' | 'inactive' | 'maintenance';
  merchantId?: string;
  merchant?: {
    id: string;
    name: string;
  };
  distance?: number;
}

export interface NearbyStationsParams {
  lat: string;
  lng: string;
  radius?: string;
}

export const stationsAPI = {
  getAllStations: () =>
    apiClient.get<Station[]>('/stations'),

  getStationById: (stationId: string) =>
    apiClient.get<Station>(`/stations/${stationId}`),

  getNearbyStations: (params: NearbyStationsParams) => {
    const queryParams: Record<string, string> = {
      lat: params.lat,
      lng: params.lng,
      ...(params.radius && { radius: params.radius }),
    };
    return apiClient.get<Station[]>('/stations', queryParams);
  },
};
