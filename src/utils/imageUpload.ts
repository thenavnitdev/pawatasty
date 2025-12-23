import { supabase } from '../lib/supabase';
import { clearProfileImageCache } from './imageUtils';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface UploadError {
  message: string;
  code?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a valid image file (JPEG, PNG, or WebP)';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Image size must be less than 5MB';
  }

  return null;
}

export async function uploadProfilePicture(
  file: File,
  userId: string
): Promise<UploadResult> {
  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `user_profile/${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('user_images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(error.message || 'Failed to upload profile picture');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('user_images')
    .getPublicUrl(filePath);

  // Clear cache for the new path to ensure fresh load
  clearProfileImageCache(filePath);

  return {
    path: filePath,
    publicUrl
  };
}

export async function deleteProfilePicture(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('user_images')
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(error.message || 'Failed to delete profile picture');
  }
}

export async function uploadReviewImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `review_${userId}_${Date.now()}.${fileExt}`;
  const filePath = `MC_Review_images/${fileName}`;

  const { data, error } = await supabase.storage
    .from('merchant-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(error.message || 'Failed to upload review image');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('merchant-images')
    .getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl
  };
}

export async function uploadMultipleReviewImages(
  files: File[],
  userId: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadReviewImage(file, userId));
  return Promise.all(uploadPromises);
}

export async function deleteReviewImage(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('merchant-images')
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(error.message || 'Failed to delete review image');
  }
}

export function getStorageUrl(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}
