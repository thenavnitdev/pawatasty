/*
  # Fix Security Issues: Indexes and RLS Performance

  1. Missing Indexes
    - Add index on `liked_merchants.merchant_id` for foreign key lookup performance
    - Add index on `merchant_deals.merchant_id` for foreign key lookup performance

  2. RLS Performance Optimization
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row
    - Applies to tables:
      * users
      * payment_methods
      * suggestions
      * fault_reports
      * reviews
      * liked_merchants
      * deal_bookings

  3. Security Notes
    - All policies maintain the same security restrictions
    - Performance improvement only, no security changes
    - Indexes improve query performance for foreign key lookups
*/

-- =====================================================
-- PART 1: ADD MISSING INDEXES
-- =====================================================

-- Add index for liked_merchants.merchant_id foreign key
CREATE INDEX IF NOT EXISTS idx_liked_merchants_merchant_id
ON public.liked_merchants(merchant_id);

-- Add index for merchant_deals.merchant_id foreign key
CREATE INDEX IF NOT EXISTS idx_merchant_deals_merchant_id
ON public.merchant_deals(merchant_id);

-- =====================================================
-- PART 2: OPTIMIZE RLS POLICIES - USERS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

-- Recreate with optimized auth.uid() calls (cast to text for comparison)
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can delete own profile"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);

-- =====================================================
-- PART 3: OPTIMIZE RLS POLICIES - PAYMENT_METHODS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);

-- =====================================================
-- PART 4: OPTIMIZE RLS POLICIES - SUGGESTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can create own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can update own suggestions" ON public.suggestions;

CREATE POLICY "Users can view own suggestions"
  ON public.suggestions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can create own suggestions"
  ON public.suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can update own suggestions"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- =====================================================
-- PART 5: OPTIMIZE RLS POLICIES - FAULT_REPORTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own fault reports" ON public.fault_reports;
DROP POLICY IF EXISTS "Users can create own fault reports" ON public.fault_reports;

CREATE POLICY "Users can view own fault reports"
  ON public.fault_reports
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can create own fault reports"
  ON public.fault_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

-- =====================================================
-- PART 6: OPTIMIZE RLS POLICIES - REVIEWS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;

CREATE POLICY "Users can create reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can update own reviews"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);

-- =====================================================
-- PART 7: OPTIMIZE RLS POLICIES - LIKED_MERCHANTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own liked merchants" ON public.liked_merchants;
DROP POLICY IF EXISTS "Users can like merchants" ON public.liked_merchants;
DROP POLICY IF EXISTS "Users can unlike merchants" ON public.liked_merchants;

CREATE POLICY "Users can view own liked merchants"
  ON public.liked_merchants
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can like merchants"
  ON public.liked_merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can unlike merchants"
  ON public.liked_merchants
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);

-- =====================================================
-- PART 8: OPTIMIZE RLS POLICIES - DEAL_BOOKINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own deal bookings" ON public.deal_bookings;
DROP POLICY IF EXISTS "Users can create deal bookings" ON public.deal_bookings;
DROP POLICY IF EXISTS "Users can update own deal bookings" ON public.deal_bookings;
DROP POLICY IF EXISTS "Users can delete own deal bookings" ON public.deal_bookings;

CREATE POLICY "Users can view own deal bookings"
  ON public.deal_bookings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can create deal bookings"
  ON public.deal_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can update own deal bookings"
  ON public.deal_bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "Users can delete own deal bookings"
  ON public.deal_bookings
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);
