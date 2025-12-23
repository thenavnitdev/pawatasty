/*
  # Update Points Source Constraint and Backfill Welcome Points
  
  ## Summary
  Adds 'welcome' and 'rental' to allowed source types and backfills welcome points
  for existing users.
  
  ## Changes
  1. Drop old source constraint
  2. Add new constraint with 'welcome' and 'rental' included
  3. Backfill welcome points for existing users who don't have them
  
  ## Security
  - Maintains data integrity with proper constraints
  - Prevents duplicate welcome points
*/

-- Drop the old constraint
ALTER TABLE points_transactions 
DROP CONSTRAINT IF EXISTS points_transactions_source_check;

-- Add new constraint with all valid sources
ALTER TABLE points_transactions
ADD CONSTRAINT points_transactions_source_check 
CHECK (source = ANY (ARRAY[
  'referral'::text, 
  'purchase'::text, 
  'promo'::text, 
  'subscription'::text, 
  'booking'::text,
  'welcome'::text,
  'rental'::text
]));

-- Award welcome points to all existing users who don't have them yet
INSERT INTO points_transactions (user_id, amount, type, source, description, created_at)
SELECT 
  u.user_id,
  30,
  'earned',
  'welcome',
  'Welcome to Pawatasty!',
  now()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM points_transactions pt 
  WHERE pt.user_id = u.user_id 
  AND pt.source IN ('welcome', 'promo')
  AND pt.description LIKE '%Welcome%'
)
AND u.user_id IS NOT NULL
AND u.email IS NOT NULL
AND u.user_id != '';
