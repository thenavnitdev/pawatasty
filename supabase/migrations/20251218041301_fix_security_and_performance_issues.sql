/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing index for promo_content.created_by foreign key
    - Drop unused indexes to reduce maintenance overhead

  2. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) in all RLS policies
    - This prevents re-evaluation per row and improves query performance
    - Affects tables: rentals, merchant_subcategories, payment_methods, promo_content, subscription_history

  3. Security Fixes
    - Remove overlapping permissive policies on subscription_history
    - Fix security definer views to use security invoker
    - Fix function search path to be immutable

  4. Manual Configuration Required
    - Leaked Password Protection must be enabled in Supabase Dashboard
    - Navigate to Authentication > Settings > Security
    - Enable "Password breach detection"
*/

-- ============================================================================
-- 1. ADD MISSING INDEX FOR FOREIGN KEY
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'promo_content'
    AND indexname = 'idx_promo_content_created_by'
  ) THEN
    CREATE INDEX idx_promo_content_created_by ON public.promo_content(created_by);
  END IF;
END $$;

-- ============================================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS public.idx_billing_transactions_user_id;
DROP INDEX IF EXISTS public.idx_events_user_id;
DROP INDEX IF EXISTS public.idx_fault_report_notes_admin_id;
DROP INDEX IF EXISTS public.idx_fault_reports_assigned_to;
DROP INDEX IF EXISTS public.idx_fault_reports_booking_id;
DROP INDEX IF EXISTS public.idx_fault_reports_order_id;
DROP INDEX IF EXISTS public.idx_liked_merchants_merchant_id;
DROP INDEX IF EXISTS public.idx_merchants_subcategory_id;
DROP INDEX IF EXISTS public.idx_subscription_history_user_id;

-- ============================================================================
-- 3. FIX RLS POLICIES - RENTALS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own rentals" ON public.rentals;
DROP POLICY IF EXISTS "Users can create own rentals" ON public.rentals;
DROP POLICY IF EXISTS "Users can update own rentals" ON public.rentals;

CREATE POLICY "Users can view own rentals"
  ON public.rentals
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can create own rentals"
  ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own rentals"
  ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

-- ============================================================================
-- 4. FIX RLS POLICIES - MERCHANT_SUBCATEGORIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Allow admin insert to subcategories" ON public.merchant_subcategories;
DROP POLICY IF EXISTS "Allow admin update to subcategories" ON public.merchant_subcategories;
DROP POLICY IF EXISTS "Allow admin delete to subcategories" ON public.merchant_subcategories;

CREATE POLICY "Allow admin insert to subcategories"
  ON public.merchant_subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

CREATE POLICY "Allow admin update to subcategories"
  ON public.merchant_subcategories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

CREATE POLICY "Allow admin delete to subcategories"
  ON public.merchant_subcategories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

-- ============================================================================
-- 5. FIX RLS POLICIES - PAYMENT_METHODS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text))
  WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- ============================================================================
-- 6. FIX RLS POLICIES - PROMO_CONTENT TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all promos" ON public.promo_content;
DROP POLICY IF EXISTS "Admins can insert promos" ON public.promo_content;
DROP POLICY IF EXISTS "Admins can update promos" ON public.promo_content;
DROP POLICY IF EXISTS "Admins can delete promos" ON public.promo_content;

CREATE POLICY "Admins can view all promos"
  ON public.promo_content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

CREATE POLICY "Admins can insert promos"
  ON public.promo_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

CREATE POLICY "Admins can update promos"
  ON public.promo_content
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

CREATE POLICY "Admins can delete promos"
  ON public.promo_content
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

-- ============================================================================
-- 7. FIX RLS POLICIES - SUBSCRIPTION_HISTORY TABLE
-- ============================================================================

-- Remove overlapping permissive policies
DROP POLICY IF EXISTS "Admins can view conversion data" ON public.subscription_history;
DROP POLICY IF EXISTS "View own or admin view all history" ON public.subscription_history;

-- Create a single comprehensive policy
CREATE POLICY "Users view own history, admins view all"
  ON public.subscription_history
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = (select auth.uid()::text)
      AND role_id = 'admin'
    )
  );

-- ============================================================================
-- 8. FIX SECURITY DEFINER VIEWS
-- ============================================================================

-- Recreate active_promo_content view with SECURITY INVOKER
DROP VIEW IF EXISTS public.active_promo_content;

CREATE VIEW public.active_promo_content
WITH (security_invoker = true)
AS
SELECT
  pc.*
FROM public.promo_content pc
WHERE
  (pc.scheduled_start IS NULL OR pc.scheduled_start <= CURRENT_TIMESTAMP)
  AND (pc.scheduled_end IS NULL OR pc.scheduled_end >= CURRENT_TIMESTAMP)
  AND pc.is_active = true;

-- Recreate subscription_conversions view with SECURITY INVOKER
DROP VIEW IF EXISTS public.subscription_conversions;

CREATE VIEW public.subscription_conversions
WITH (security_invoker = true)
AS
SELECT
  sh.user_id,
  sh.previous_tier,
  sh.new_tier,
  sh.effective_date,
  sh.event_type,
  u.email,
  u.full_name
FROM public.subscription_history sh
JOIN public.users u ON sh.user_id = u.user_id
WHERE sh.previous_tier = 'free' AND sh.new_tier != 'free';

-- ============================================================================
-- 9. FIX FUNCTION SEARCH PATH
-- ============================================================================

-- Recreate calculate_rental_fee function with STABLE search_path
DROP FUNCTION IF EXISTS public.calculate_rental_fee(interval);

CREATE OR REPLACE FUNCTION public.calculate_rental_fee(rental_duration interval)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  hours numeric;
  fee numeric;
BEGIN
  -- Calculate total hours (rounded up)
  hours := CEIL(EXTRACT(EPOCH FROM rental_duration) / 3600);

  -- Base fee: €1 per hour
  fee := hours * 1.00;

  -- Minimum fee of €2
  IF fee < 2.00 THEN
    fee := 2.00;
  END IF;

  -- Maximum daily cap of €15
  IF fee > 15.00 THEN
    fee := 15.00;
  END IF;

  RETURN fee;
END;
$$;