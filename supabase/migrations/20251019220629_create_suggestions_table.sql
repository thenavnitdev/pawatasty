/*
  # Create suggestions table

  1. New Tables
    - `suggestions`
      - `id` (uuid, primary key) - Unique identifier for suggestion
      - `user_id` (uuid, foreign key) - References auth.users
      - `category` (text) - Category of the suggestion
      - `title` (text) - Title/subject of the suggestion
      - `description` (text) - Detailed description
      - `status` (text) - Status of suggestion (pending, reviewed, implemented)
      - `created_at` (timestamptz) - When suggestion was created
      - `updated_at` (timestamptz) - When suggestion was last updated

  2. Security
    - Enable RLS on `suggestions` table
    - Add policy for authenticated users to insert their own suggestions
    - Add policy for authenticated users to read their own suggestions
*/

CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own suggestions"
  ON suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
