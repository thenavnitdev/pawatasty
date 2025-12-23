import { callEdgeFunction } from '../edgeFunctions';
import { Merchant } from './merchantsEdge';

export const likedMerchantsEdgeAPI = {
  getLikedMerchants: () =>
    callEdgeFunction<Merchant[]>('liked-merchants'),

  likeMerchant: (merchantId: string) =>
    callEdgeFunction<{ success: boolean; message: string }>(
      'liked-merchants',
      `/${merchantId}`,
      { method: 'POST' }
    ),

  unlikeMerchant: (merchantId: string) =>
    callEdgeFunction<{ success: boolean; message: string }>(
      'liked-merchants',
      `/${merchantId}`,
      { method: 'DELETE' }
    ),
};
