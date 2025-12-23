/*
  # Create fault reports table

  1. New Tables
    - `fault_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `report_type` (text) - 'power_station', 'power_bank', 'mobile_app', 'suggestion'
      - `qr_code` (text, optional) - For power station/bank reports
      - `category` (text) - The selected category
      - `description` (text) - User's description of the issue/suggestion
      - `status` (text) - 'pending', 'in_progress', 'resolved'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `fault_reports` table
    - Add policy for authenticated users to create their own reports
    - Add policy for authenticated users to read their own reports
    - Add policy for authenticated users to update their own reports
*/

CREATE TABLE IF NOT EXISTS fault_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL,
  qr_code text,
  category text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE fault_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own fault reports"
  ON fault_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own fault reports"
  ON fault_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own fault reports"
  ON fault_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fault_reports_user_id ON fault_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_fault_reports_created_at ON fault_reports(created_at DESC);
