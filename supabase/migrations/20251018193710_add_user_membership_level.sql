/*
  # Add User Membership Level to User Profiles

  1. Changes
    - Add `membership_level` column to `user_profiles` table
      - integer type with default value of 1
      - represents the user's membership tier (1-5)
    - Add check constraint to ensure level is between 1 and 5

  2. Notes
    - Default membership level is 1 for all users
    - Levels range from 1 (basic) to 5 (premium)
    - Existing users will be set to level 1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'membership_level'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN membership_level integer DEFAULT 1 NOT NULL;
    ALTER TABLE user_profiles ADD CONSTRAINT check_membership_level CHECK (membership_level >= 1 AND membership_level <= 5);
  END IF;
END $$;
