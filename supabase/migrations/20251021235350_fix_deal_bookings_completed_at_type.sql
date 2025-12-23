/*
  # Fix deal_bookings.completed_at Data Type
  
  1. Issue
    - completed_at column is TEXT instead of TIMESTAMP
    - Prevents proper date/time operations
    - Sorting and comparisons are string-based (incorrect)
  
  2. Fix
    - Convert TEXT column to TIMESTAMP WITH TIME ZONE
    - Preserve existing data if it's valid
    - Set NULL for invalid dates
  
  3. Impact
    - Enables proper date queries
    - Correct sorting by completion time
    - Better date comparisons
*/

-- Step 1: Add new column with correct type
ALTER TABLE deal_bookings 
ADD COLUMN completed_at_new TIMESTAMP WITH TIME ZONE;

-- Step 2: Convert valid timestamps from text to timestamp
UPDATE deal_bookings
SET completed_at_new = 
  CASE 
    WHEN completed_at IS NOT NULL 
      AND completed_at != '' 
      AND completed_at ~ '^\d{4}-\d{2}-\d{2}' 
    THEN completed_at::timestamp with time zone
    ELSE NULL
  END;

-- Step 3: Drop old column
ALTER TABLE deal_bookings DROP COLUMN completed_at;

-- Step 4: Rename new column to original name
ALTER TABLE deal_bookings RENAME COLUMN completed_at_new TO completed_at;
