import { callEdgeFunction } from '../edgeFunctions';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  sortOrder: number;
}

export const categoriesEdgeAPI = {
  getCategories: () =>
    callEdgeFunction<Category[]>('categories', '/categories', { requireAuth: false }),
};
