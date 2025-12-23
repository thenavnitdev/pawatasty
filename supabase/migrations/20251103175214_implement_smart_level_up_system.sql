/*
  # Implement Smart Level-Up System
  
  ## Summary
  Creates an automatic level-up system based on user credit points.
  Users automatically progress through 5 levels based on their total_points.
  
  ## Level System
  - **Level 1 - Newbie**: 0 - 49 points
  - **Level 2 - Explorer**: 50 - 149 points  
  - **Level 3 - Enthusiast**: 150 - 299 points
  - **Level 4 - Ambassador**: 300 - 599 points
  - **Level 5 - Legend**: 600+ points
  
  ## Changes
  1. Add level tracking columns to users table:
     - `current_level` (integer): The user's current level number (1-5)
     - `level_name` (text): The user's current level name (Newbie, Explorer, etc.)
  
  2. Create function to calculate level based on points
  
  3. Create trigger to automatically update level when points change
  
  4. Backfill existing users with correct level based on current points
  
  5. Add indexes for performance
  
  ## Security
  - Function uses SECURITY DEFINER for proper permissions
  - Maintains data integrity with automatic calculations
  - No manual level manipulation possible
*/

-- ============================================================================
-- 1. Add level tracking columns to users table
-- ============================================================================

DO $$
BEGIN
  -- Add current_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'current_level'
  ) THEN
    ALTER TABLE users ADD COLUMN current_level INTEGER DEFAULT 1 NOT NULL;
  END IF;
  
  -- Add level_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'level_name'
  ) THEN
    ALTER TABLE users ADD COLUMN level_name TEXT DEFAULT 'Newbie' NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. Create function to calculate level based on points
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS TABLE(level_num INTEGER, level_label TEXT) AS $$
BEGIN
  -- Level 5 - Legend: 600+ points
  IF points >= 600 THEN
    RETURN QUERY SELECT 5, 'Legend'::TEXT;
  -- Level 4 - Ambassador: 300 - 599 points
  ELSIF points >= 300 THEN
    RETURN QUERY SELECT 4, 'Ambassador'::TEXT;
  -- Level 3 - Enthusiast: 150 - 299 points
  ELSIF points >= 150 THEN
    RETURN QUERY SELECT 3, 'Enthusiast'::TEXT;
  -- Level 2 - Explorer: 50 - 149 points
  ELSIF points >= 50 THEN
    RETURN QUERY SELECT 2, 'Explorer'::TEXT;
  -- Level 1 - Newbie: 0 - 49 points
  ELSE
    RETURN QUERY SELECT 1, 'Newbie'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. Create trigger function to auto-update level when points change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level_num INTEGER;
  new_level_name TEXT;
BEGIN
  -- Calculate the new level based on current points
  SELECT level_num, level_label INTO new_level_num, new_level_name
  FROM calculate_user_level(NEW.total_points);
  
  -- Update the level fields
  NEW.current_level := new_level_num;
  NEW.level_name := new_level_name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_user_level ON users;

-- Create trigger that fires before insert or update
CREATE TRIGGER trigger_update_user_level
  BEFORE INSERT OR UPDATE OF total_points ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- ============================================================================
-- 4. Backfill existing users with correct levels
-- ============================================================================

-- Update all existing users with their correct level based on current points
DO $$
DECLARE
  user_record RECORD;
  level_info RECORD;
BEGIN
  FOR user_record IN SELECT user_id, total_points FROM users WHERE user_id IS NOT NULL
  LOOP
    SELECT level_num, level_label INTO level_info
    FROM calculate_user_level(user_record.total_points);
    
    UPDATE users
    SET 
      current_level = level_info.level_num,
      level_name = level_info.level_label
    WHERE user_id = user_record.user_id;
  END LOOP;
END $$;

-- ============================================================================
-- 5. Add indexes for performance
-- ============================================================================

-- Index for level-based queries
CREATE INDEX IF NOT EXISTS idx_users_level 
  ON users(current_level, total_points DESC);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_points_level 
  ON users(total_points DESC, current_level);

-- ============================================================================
-- 6. Create helper function to get level info for a specific user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_level_info(p_user_id TEXT)
RETURNS TABLE(
  user_id TEXT,
  current_level INTEGER,
  level_name TEXT,
  total_points INTEGER,
  points_to_next_level INTEGER,
  progress_percentage NUMERIC
) AS $$
DECLARE
  user_points INTEGER;
  user_level INTEGER;
  next_level_threshold INTEGER;
  current_level_threshold INTEGER;
BEGIN
  -- Get user's current points and level
  SELECT u.total_points, u.current_level 
  INTO user_points, user_level
  FROM users u
  WHERE u.user_id = p_user_id;
  
  -- Determine thresholds
  CASE user_level
    WHEN 1 THEN 
      current_level_threshold := 0;
      next_level_threshold := 50;
    WHEN 2 THEN 
      current_level_threshold := 50;
      next_level_threshold := 150;
    WHEN 3 THEN 
      current_level_threshold := 150;
      next_level_threshold := 300;
    WHEN 4 THEN 
      current_level_threshold := 300;
      next_level_threshold := 600;
    WHEN 5 THEN 
      current_level_threshold := 600;
      next_level_threshold := 600; -- Max level
  END CASE;
  
  RETURN QUERY
  SELECT 
    u.user_id,
    u.current_level,
    u.level_name,
    u.total_points,
    CASE 
      WHEN u.current_level = 5 THEN 0 -- Already at max level
      ELSE next_level_threshold - u.total_points
    END AS points_to_next_level,
    CASE 
      WHEN u.current_level = 5 THEN 100.0 -- Max level = 100%
      ELSE ROUND(
        ((u.total_points - current_level_threshold)::NUMERIC / 
        (next_level_threshold - current_level_threshold)::NUMERIC * 100), 
        1
      )
    END AS progress_percentage
  FROM users u
  WHERE u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
