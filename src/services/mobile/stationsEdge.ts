import { callEdgeFunction } from '../edgeFunctions';

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  returnSlots: number;
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

export const stationsEdgeAPI = {
  getAllStations: () =>
    callEdgeFunction<Station[]>('stations', '/stations', { requireAuth: false }),

  getStationById: (stationId: string) =>
    callEdgeFunction<Station>('stations', `/stations/${stationId}`, { requireAuth: false }),

  getNearbyStations: (params: NearbyStationsParams) => {
    const queryParams = new URLSearchParams({
      lat: params.lat,
      lng: params.lng,
      ...(params.radius && { radius: params.radius }),
    });
    return callEdgeFunction<Station[]>('stations', `/stations?${queryParams.toString()}`, { requireAuth: false });
  },
};
