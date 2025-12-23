import { apiClient } from './client';
import { Review, ReviewStats, CreateReviewRequest } from '../../types';

export const reviewsAPI = {
  getReviews: (targetType: string, targetId: string) =>
    apiClient.get<Review[]>(`/api/mobile/reviews/${targetType}/${targetId}`),

  getReviewStats: (targetType: string, targetId: string) =>
    apiClient.get<ReviewStats>(`/api/mobile/reviews/${targetType}/${targetId}/stats`),

  createReview: (reviewData: CreateReviewRequest) =>
    apiClient.post<Review>('/api/mobile/reviews', reviewData),

  updateReview: (reviewId: string, reviewData: Partial<CreateReviewRequest>) =>
    apiClient.put<Review>(`/api/mobile/reviews/${reviewId}`, reviewData),

  deleteReview: (reviewId: string) =>
    apiClient.delete<void>(`/api/mobile/reviews/${reviewId}`),

  markHelpful: (reviewId: string) =>
    apiClient.post<void>(`/api/mobile/reviews/${reviewId}/helpful`, {}),
};
