/*
  # Fix Security Issues - Part 2: RLS Policy Optimization

  1. Optimize RLS Policies
    - Replace auth.uid() with (select auth.uid()) for better performance
    - Apply to all tables with auth function calls

  2. Tables Updated
    - users
    - payment_methods
    - suggestions
    - fault_reports
    - reviews
    - liked_merchants
    - deal_bookings
*/

-- ============================================================================
-- OPTIMIZE RLS POLICIES - USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can delete own profile"
  ON users FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- ============================================================================
-- OPTIMIZE RLS POLICIES - PAYMENT_METHODS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;

CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- ============================================================================
-- OPTIMIZE RLS POLICIES - SUGGESTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create own suggestions" ON suggestions;
DROP POLICY IF EXISTS "Users can view own suggestions" ON suggestions;
DROP POLICY IF EXISTS "Users can update own suggestions" ON suggestions;

CREATE POLICY "Users can create own suggestions"
  ON suggestions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can view own suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own suggestions"
  ON suggestions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

-- ============================================================================
-- OPTIMIZE RLS POLICIES - FAULT_REPORTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create own fault reports" ON fault_reports;
DROP POLICY IF EXISTS "Users can view own fault reports" ON fault_reports;

CREATE POLICY "Users can create own fault reports"
  ON fault_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can view own fault reports"
  ON fault_reports FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- ============================================================================
-- OPTIMIZE RLS POLICIES - REVIEWS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- ============================================================================
-- OPTIMIZE RLS POLICIES - LIKED_MERCHANTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own liked merchants" ON liked_merchants;
DROP POLICY IF EXISTS "Users can like merchants" ON liked_merchants;
DROP POLICY IF EXISTS "Users can unlike merchants" ON liked_merchants;

CREATE POLICY "Users can view own liked merchants"
  ON liked_merchants FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can like merchants"
  ON liked_merchants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can unlike merchants"
  ON liked_merchants FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- ============================================================================
-- OPTIMIZE RLS POLICIES - DEAL_BOOKINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can create deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can update own deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can delete own deal bookings" ON deal_bookings;

CREATE POLICY "Users can view own deal bookings"
  ON deal_bookings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can create deal bookings"
  ON deal_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own deal bookings"
  ON deal_bookings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can delete own deal bookings"
  ON deal_bookings FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()::text));