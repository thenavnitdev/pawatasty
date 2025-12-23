import { callEdgeFunction } from '../edgeFunctions';

export interface MenuItem {
  id: number;
  merchantId: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  isAvailable: boolean;
  sortOrder: number;
}

export const menuItemsAPI = {
  getMenuItems: (merchantId: string) =>
    callEdgeFunction<MenuItem[]>('menu-items', `/${merchantId}`),
};
