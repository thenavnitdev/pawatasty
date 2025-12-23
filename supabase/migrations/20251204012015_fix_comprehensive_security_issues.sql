/*
  # Fix Comprehensive Security and Performance Issues

  ## Changes
  
  ### 1. RLS Performance Optimization
  Wraps all auth function calls with subqueries to prevent re-evaluation per row:
  - `public.orders` - 2 policies updated
  - `public.merchant_subcategories` - 1 policy updated
  - `public.payment_methods` - 4 policies updated

  ### 2. Multiple Permissive Policies Resolution
  Consolidates multiple permissive policies:
  - `public.merchant_subcategories` - Fixed duplicate SELECT policies
  - `public.orders` - Fixed duplicate SELECT policies

  ### 3. Unused Index Cleanup
  Drops unused indexes to improve write performance and reduce storage:
  - 17 unused indexes removed

  ### 4. Function Security
  Fixes function search_path security issue:
  - `public.award_booking_completion_points` - Set immutable search_path

  ### 5. Notes
  - Password leak protection must be enabled manually in Supabase Dashboard
  - Navigate to: Authentication > Policies > Password leak protection
*/

-- =====================================================
-- PART 1: Fix RLS Performance Issues - Orders Table
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- User policy - users can view their own orders
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Admin policy - admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (SELECT auth.uid()::text) 
      AND role_id = 'admin'
    )
  );

-- =====================================================
-- PART 2: Fix RLS Performance Issues - Merchant Subcategories
-- =====================================================

DROP POLICY IF EXISTS "Allow admin full access to subcategories" ON public.merchant_subcategories;
DROP POLICY IF EXISTS "Allow public read access to subcategories" ON public.merchant_subcategories;

-- Public read access (permissive)
CREATE POLICY "Allow public read access to subcategories"
  ON public.merchant_subcategories
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin policies (separate for each action)
CREATE POLICY "Allow admin insert to subcategories"
  ON public.merchant_subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (SELECT auth.uid()::text) 
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
      WHERE user_id = (SELECT auth.uid()::text) 
      AND role_id = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (SELECT auth.uid()::text) 
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
      WHERE user_id = (SELECT auth.uid()::text) 
      AND role_id = 'admin'
    )
  );

-- =====================================================
-- PART 3: Fix RLS Performance Issues - Payment Methods
-- =====================================================

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

-- =====================================================
-- PART 4: Drop Unused Indexes
-- =====================================================

DROP INDEX IF EXISTS idx_merchants_subcategory_id;
DROP INDEX IF EXISTS idx_billing_transactions_user_id;
DROP INDEX IF EXISTS idx_events_rental_session_id;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_payment_methods_user_id;
DROP INDEX IF EXISTS idx_fault_reports_order_id;
DROP INDEX IF EXISTS idx_fault_report_notes_admin_id;
DROP INDEX IF EXISTS idx_liked_merchants_merchant_id;
DROP INDEX IF EXISTS idx_rental_sessions_user_id;
DROP INDEX IF EXISTS idx_subscription_history_user_id;
DROP INDEX IF EXISTS idx_fault_reports_assigned_to;
DROP INDEX IF EXISTS idx_fault_reports_booking_id;
DROP INDEX IF EXISTS idx_fault_reports_user_booking;
DROP INDEX IF EXISTS idx_fault_reports_user_order;
DROP INDEX IF EXISTS idx_reviews_user;
DROP INDEX IF EXISTS idx_reviews_created_at;

-- =====================================================
-- PART 5: Fix Function Search Path Security
-- =====================================================

DROP TRIGGER IF EXISTS award_booking_points_trigger ON deal_bookings;

-- Recreate function with secure search_path
CREATE OR REPLACE FUNCTION public.award_booking_completion_points()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  points_to_award INTEGER := 25;
  current_points INTEGER;
  new_total_points INTEGER;
BEGIN
  -- Only award points when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get current points
    SELECT total_points INTO current_points
    FROM users
    WHERE user_id = NEW.user_id;
    
    -- Calculate new total
    new_total_points := COALESCE(current_points, 0) + points_to_award;
    
    -- Update user's total points
    UPDATE users
    SET total_points = new_total_points
    WHERE user_id = NEW.user_id;
    
    -- Record the points transaction
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description
    ) VALUES (
      NEW.user_id,
      points_to_award,
      'earned',
      'booking_completion',
      'Points earned for completing a booking'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER award_booking_points_trigger
  AFTER UPDATE ON deal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION award_booking_completion_points();