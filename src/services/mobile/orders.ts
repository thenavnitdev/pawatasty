import { apiClient } from './client';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  stationId: string;
  powerbankId: string;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  rentedAt: string;
  returnedAt?: string;
  returnStationId?: string;
  totalCost?: number;
  deposit?: number;
  station?: {
    id: string;
    name: string;
    address: string;
  };
  returnStation?: {
    id: string;
    name: string;
    address: string;
  };
}

export interface RentPowerbankRequest {
  stationId: string;
  paymentMethodId?: string;
}

export interface ReturnPowerbankRequest {
  returnStationId: string;
}

export const ordersAPI = {
  rentPowerbank: (data: RentPowerbankRequest) =>
    apiClient.post<Order>('/orders', data),

  getOrders: () =>
    apiClient.get<Order[]>('/orders'),

  getOrderByNumber: (orderNumber: string) =>
    apiClient.get<Order>(`/orders/${orderNumber}`),

  returnPowerbank: (orderNumber: string, data: ReturnPowerbankRequest) =>
    apiClient.put<Order>(`/orders/${orderNumber}/return`, data),
};
