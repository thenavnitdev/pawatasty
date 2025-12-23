import { apiClient } from './client';

export interface Category {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  merchantCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  merchantIds?: string[];
}

export const categoriesAPI = {
  getAllCategories: () =>
    apiClient.get<Category[]>('/categories'),

  getAllBrands: () =>
    apiClient.get<Brand[]>('/brands'),
};
