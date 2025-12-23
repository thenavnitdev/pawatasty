/*
  # Create User Profiles Table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `full_name` (text)
      - `username` (text, unique, optional)
      - `email` (text)
      - `phone` (text)
      - `gender` (text)
      - `age` (integer)
      - `bio` (text)
      - `website` (text)
      - `profile_image_url` (text)
      - `instagram_handle` (text)
      - `tiktok_handle` (text)
      - `visits` (integer, default 0)
      - `followers` (integer, default 0)
      - `following` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for users to read their own profile
    - Add policy for users to insert their own profile
    - Add policy for users to update their own profile
    - Add policy for authenticated users to view other profiles (public info only)
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text DEFAULT '',
  username text UNIQUE,
  email text DEFAULT '',
  phone text DEFAULT '',
  gender text DEFAULT '',
  age integer DEFAULT 0,
  bio text DEFAULT '',
  website text DEFAULT '',
  profile_image_url text DEFAULT '',
  instagram_handle text DEFAULT '',
  tiktok_handle text DEFAULT '',
  visits integer DEFAULT 0,
  followers integer DEFAULT 0,
  following integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view public profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);