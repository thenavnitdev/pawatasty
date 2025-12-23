import { callEdgeFunction } from '../edgeFunctions';

export interface Review {
  id: string;
  merchantId: string;
  merchantName?: string;
  userId?: string;
  userName?: string;
  rating: number;
  comment?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  merchantId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  images?: string[];
}

export const reviewsEdgeAPI = {
  getMerchantReviews: (merchantId: string) =>
    callEdgeFunction<Review[]>('reviews', `/merchant/${merchantId}`, { requireAuth: false }),

  getUserReviews: () =>
    callEdgeFunction<Review[]>('reviews', '/user', { requireAuth: true }),

  createReview: (data: CreateReviewRequest) =>
    callEdgeFunction<Review>('reviews', '', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  updateReview: (reviewId: string, data: UpdateReviewRequest) =>
    callEdgeFunction<Review>('reviews', `/${reviewId}`, {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),

  deleteReview: (reviewId: string) =>
    callEdgeFunction<{ success: boolean; message: string }>(
      'reviews',
      `/${reviewId}`,
      { method: 'DELETE', requireAuth: true }
    ),
};
