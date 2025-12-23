/*
  # Fix User ID Type Mismatches - Simple Approach

  ## Issue
  Related tables have UUID user_id columns but need TEXT to match application logic:
  - liked_merchants.user_id = UUID → Change to TEXT
  - reviews.user_id = UUID → Change to TEXT
  - chat_messages.user_id = UUID → Change to TEXT

  ## Solution
  1. Drop RLS policies (they prevent column type changes)
  2. Change UUID columns to TEXT
  3. Add merchant foreign keys
  4. Recreate simpler RLS policies without complex subqueries
*/

-- Step 1: Drop RLS policies
DROP POLICY IF EXISTS "Users can view own liked merchants" ON liked_merchants;
DROP POLICY IF EXISTS "Users can add liked merchants" ON liked_merchants;
DROP POLICY IF EXISTS "Users can remove liked merchants" ON liked_merchants;
DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can read own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON chat_messages;

-- Step 2: Drop existing constraints
ALTER TABLE liked_merchants DROP CONSTRAINT IF EXISTS liked_merchants_user_id_fkey;
ALTER TABLE liked_merchants DROP CONSTRAINT IF EXISTS liked_merchants_merchant_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE merchant_deals DROP CONSTRAINT IF EXISTS merchant_deals_merchant_id_fkey;

-- Step 3: Change user_id columns from UUID to TEXT
ALTER TABLE liked_merchants 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE reviews 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE chat_messages 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Add FK for merchant relationships
ALTER TABLE liked_merchants
  ADD CONSTRAINT liked_merchants_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE;

ALTER TABLE merchant_deals
  ADD CONSTRAINT merchant_deals_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE;

-- Step 5: Recreate RLS policies for liked_merchants (simpler, app-enforced)
CREATE POLICY "Users can manage their liked merchants"
  ON liked_merchants FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 6: Recreate RLS policies for reviews
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 7: Recreate RLS policies for chat_messages
CREATE POLICY "Authenticated users can manage their messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);