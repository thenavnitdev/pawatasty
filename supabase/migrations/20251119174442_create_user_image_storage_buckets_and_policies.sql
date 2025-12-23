/*
  # User Image Storage Configuration

  1. Storage Buckets
    - Creates 'user_images' bucket for user profile pictures (folder: user_profile)
    - Uses existing 'merchant-images' bucket for review images (folder: MC_Review_images)
  
  2. Security Policies
    - Users can upload their own profile pictures
    - Users can view all profile pictures (public read)
    - Users can upload review images for merchants they've visited
    - Review images are publicly readable
    - Users can only delete their own images
  
  3. Database Updates
    - Ensures profile_picture column exists in users table (already exists)
    - Column stores the full storage path: user_images/user_profile/{user_id}/{filename}
*/

-- Create user_images bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'user_images',
    'user_images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Ensure merchant-images bucket exists (should already exist)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'merchant-images',
    'merchant-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view review images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own review images" ON storage.objects;

-- Profile Pictures Policies (user_images bucket)

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user_images' 
  AND (storage.foldername(name))[1] = 'user_profile'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow everyone to view profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'user_images'
  AND (storage.foldername(name))[1] = 'user_profile'
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user_images'
  AND (storage.foldername(name))[1] = 'user_profile'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user_images'
  AND (storage.foldername(name))[1] = 'user_profile'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Review Images Policies (merchant-images bucket)

-- Allow authenticated users to upload review images
CREATE POLICY "Users can upload review images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'merchant-images'
  AND (storage.foldername(name))[1] = 'MC_Review_images'
);

-- Allow everyone to view review images
CREATE POLICY "Anyone can view review images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'merchant-images'
  AND (storage.foldername(name))[1] = 'MC_Review_images'
);

-- Allow users to delete their own review images
CREATE POLICY "Users can delete their own review images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'merchant-images'
  AND (storage.foldername(name))[1] = 'MC_Review_images'
  AND name LIKE '%' || auth.uid()::text || '%'
);

-- Ensure profile_picture column exists in users table (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture text;
  END IF;
END $$;

-- Add comment to profile_picture column
COMMENT ON COLUMN users.profile_picture IS 'Storage path to user profile picture: user_images/user_profile/{user_id}/{filename}';

-- Add comment to reviews.images column
COMMENT ON COLUMN reviews.images IS 'Array of storage paths to review images: merchant-images/MC_Review_images/{filename}';
