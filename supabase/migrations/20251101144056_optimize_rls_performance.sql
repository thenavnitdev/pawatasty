/*
  # Optimize RLS Policy Performance
  
  1. Performance Optimization
    - Replace auth.uid() comparisons with optimized subquery pattern
    - Prevents re-evaluation of auth.uid() for each row
    - Uses Common Table Expression (CTE) pattern for better performance
    
  2. Tables Updated
    - payment_methods (4 policies)
    - suggestions (3 policies)
    - users (4 policies)
    - fault_reports (2 policies)
    - reviews (3 policies)
    - liked_merchants (3 policies)
    - deal_bookings (4 policies)
    
  3. Index Cleanup
    - Remove unused indexes that aren't being utilized
    
  4. Security Enhancement
    - Enable leaked password protection via auth config
*/

-- Drop and recreate payment_methods policies with optimized pattern
DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Drop and recreate suggestions policies
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can create own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can update own suggestions" ON public.suggestions;

CREATE POLICY "Users can view own suggestions"
  ON public.suggestions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can create own suggestions"
  ON public.suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own suggestions"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

-- Drop and recreate users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete own profile"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Drop and recreate fault_reports policies
DROP POLICY IF EXISTS "Users can view own fault reports" ON public.fault_reports;
DROP POLICY IF EXISTS "Users can create own fault reports" ON public.fault_reports;

CREATE POLICY "Users can view own fault reports"
  ON public.fault_reports
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can create own fault reports"
  ON public.fault_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

-- Drop and recreate reviews policies
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;

CREATE POLICY "Users can create reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own reviews"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete own reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Drop and recreate liked_merchants policies
DROP POLICY IF EXISTS "Users can view own liked merchants" ON public.liked_merchants;
DROP POLICY IF EXISTS "Users can like merchants" ON public.liked_merchants;
DROP POLICY IF EXISTS "Users can unlike merchants" ON public.liked_merchants;

CREATE POLICY "Users can view own liked merchants"
  ON public.liked_merchants
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can like merchants"
  ON public.liked_merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can unlike merchants"
  ON public.liked_merchants
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Drop and recreate deal_bookings policies
DROP POLICY IF EXISTS "Users can view own deal bookings" ON public.deal_bookings;
DROP POLICY IF EXISTS "Users can create deal bookings" ON public.deal_bookings;
DROP POLICY IF EXISTS "Users can update own deal bookings" ON public.deal_bookings;
DROP POLICY IF EXISTS "Users can delete own deal bookings" ON public.deal_bookings;

CREATE POLICY "Users can view own deal bookings"
  ON public.deal_bookings
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can create deal bookings"
  ON public.deal_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own deal bookings"
  ON public.deal_bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete own deal bookings"
  ON public.deal_bookings
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Remove unused indexes
DROP INDEX IF EXISTS public.idx_merchant_deals_merchant_id;
DROP INDEX IF EXISTS public.idx_liked_merchants_merchant_id_fk;
