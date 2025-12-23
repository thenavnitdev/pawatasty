import { useState, useRef } from 'react';
import { Star, Camera, Loader2, X } from 'lucide-react';
import { reviewsAPI, reviewsEdgeAPI } from '../services/mobile';
import { CreateReviewRequest } from '../types';
import { isFeatureEnabled } from '../services/apiConfig';
import { uploadMultipleReviewImages } from '../utils/imageUpload';
import { supabase } from '../lib/supabase';

interface ReviewFormProps {
  targetType: 'merchant' | 'deal' | 'station';
  targetId: string;
  targetName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewForm({ targetType, targetId, targetName, onClose, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [ambianceRating, setAmbianceRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      setError('Please write a review');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isFeatureEnabled('USE_EDGE_REVIEWS')) {
        await reviewsEdgeAPI.createReview({
          merchantId: targetId,
          rating,
          comment: comment.trim(),
        });
      } else {
        const reviewData: CreateReviewRequest = {
          target_type: targetType,
          target_id: targetId,
          rating,
          comment: comment.trim(),
          food_rating: foodRating || undefined,
          service_rating: serviceRating || undefined,
          ambiance_rating: ambianceRating || undefined,
          value_rating: valueRating || undefined,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
        };

        await reviewsAPI.createReview(reviewData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (uploadedImages.length + files.length > 5) {
      setError('You can only upload up to 5 images');
      return;
    }

    setUploadingImages(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const results = await uploadMultipleReviewImages(files, user.id);
      const newImagePaths = results.map(r => r.path);
      setUploadedImages(prev => [...prev, ...newImagePaths]);
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const StarRating = ({
    value,
    onChange,
    size = 'large'
  }: {
    value: number;
    onChange: (rating: number) => void;
    size?: 'small' | 'large';
  }) => {
    const [hover, setHover] = useState(0);
    const starSize = size === 'large' ? 'w-12 h-12' : 'w-8 h-8';

    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`${starSize} transition-colors ${
                star <= (hover || value)
                  ? 'fill-orange-400 text-orange-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        <div className="sticky top-0 bg-white z-10 pt-3 pb-2">
          <div
            onClick={onClose}
            className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer active:cursor-grabbing"
          />
        </div>

        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Write a Review</h2>
            <p className="text-sm text-gray-600 mt-1">{targetName}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-gray-700 mb-3">Overall Rating</p>
              <StarRating
                value={rating}
                onChange={setRating}
                size="large"
              />
              <p className="text-sm text-gray-600 mt-2">
                {rating === 0 && 'Tap to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {targetType === 'merchant' && (
              <div className="space-y-4 bg-gray-50 rounded-2xl p-4">
                <p className="text-sm font-semibold text-gray-900">Rate Your Experience</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Food Quality</span>
                  <StarRating value={foodRating} onChange={setFoodRating} size="small" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Service</span>
                  <StarRating value={serviceRating} onChange={setServiceRating} size="small" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Ambiance</span>
                  <StarRating value={ambianceRating} onChange={setAmbianceRating} size="small" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Value for Money</span>
                  <StarRating value={valueRating} onChange={setValueRating} size="small" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {comment.length} characters
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Add Photos (Optional)</p>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {uploadedImages.map((imagePath, index) => {
                    const publicUrl = supabase.storage.from('merchant-images').getPublicUrl(imagePath).data.publicUrl;
                    return (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={publicUrl} alt={`Review ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {uploadedImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-400 hover:bg-orange-50 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImages ? (
                    <>
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Add photos</span>
                      <span className="text-xs text-gray-500">Up to 5 images</span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
