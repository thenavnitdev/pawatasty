import { callEdgeFunction } from '../edgeFunctions';

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

export const ordersEdgeAPI = {
  rentPowerbank: (data: RentPowerbankRequest) =>
    callEdgeFunction<Order>('orders-management', '/orders', {
      method: 'POST',
      body: data,
    }),

  getOrders: () =>
    callEdgeFunction<Order[]>('orders-management', '/orders'),

  getOrderByNumber: (orderNumber: string) =>
    callEdgeFunction<Order>('orders-management', `/orders/${orderNumber}`),

  returnPowerbank: (orderNumber: string, data: ReturnPowerbankRequest) =>
    callEdgeFunction<Order>('orders-management', `/orders/${orderNumber}/return`, {
      method: 'PUT',
      body: data,
    }),
};
