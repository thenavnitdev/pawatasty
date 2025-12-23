/*
  # Fix Security and Performance Issues - Comprehensive

  ## Changes
  
  ### 1. Add Missing Indexes for Foreign Keys
  Creates indexes for all unindexed foreign keys to improve query performance:
  - billing_transactions.user_id
  - events.rental_session_id
  - events.user_id
  - fault_report_notes.admin_id
  - fault_reports.assigned_to
  - fault_reports.booking_id
  - fault_reports.order_id
  - liked_merchants.merchant_id
  - merchants.subcategory_id
  - rental_sessions.user_id
  - subscription_history.user_id

  ### 2. Fix RLS Performance Issues
  Wraps all auth function calls with subqueries to prevent re-evaluation per row:
  - payment_methods - 4 policies updated
  - orders - 2 policies updated
  - merchant_subcategories - 3 policies updated

  ### 3. Consolidate Multiple Permissive Policies
  Merges duplicate SELECT policies on orders table:
  - Combines "Users can view their own orders" and "Admins can view all orders"

  ### 4. Fix Function Search Path Security
  Sets immutable search_path for:
  - increment_total_savings function

  ### 5. Notes
  - Password leak protection must be enabled manually in Supabase Dashboard
  - Navigate to: Authentication > Policies > Password leak protection
*/

-- =====================================================
-- PART 1: Add Missing Indexes for Foreign Keys
-- =====================================================

-- Create indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_events_rental_session_id ON events(rental_session_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_fault_report_notes_admin_id ON fault_report_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_fault_reports_assigned_to ON fault_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_fault_reports_booking_id ON fault_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_fault_reports_order_id ON fault_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_liked_merchants_merchant_id ON liked_merchants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_subcategory_id ON merchants(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_rental_sessions_user_id ON rental_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);

-- =====================================================
-- PART 2: Fix RLS Performance - Payment Methods Table
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;

CREATE POLICY "Users can view own payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own payment methods"
  ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- =====================================================
-- PART 3: Fix RLS Performance & Multiple Policies - Orders Table
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Single consolidated policy that handles both user and admin access
CREATE POLICY "Users and admins can view orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()::text) OR
    (SELECT (auth.jwt()->>'role')::text) = 'admin'
  );

-- =====================================================
-- PART 4: Fix RLS Performance - Merchant Subcategories Table
-- =====================================================

DROP POLICY IF EXISTS "Allow admin insert to subcategories" ON merchant_subcategories;
DROP POLICY IF EXISTS "Allow admin update to subcategories" ON merchant_subcategories;
DROP POLICY IF EXISTS "Allow admin delete to subcategories" ON merchant_subcategories;

CREATE POLICY "Allow admin insert to subcategories"
  ON merchant_subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT (auth.jwt()->>'role')::text) = 'admin');

CREATE POLICY "Allow admin update to subcategories"
  ON merchant_subcategories
  FOR UPDATE
  TO authenticated
  USING ((SELECT (auth.jwt()->>'role')::text) = 'admin')
  WITH CHECK ((SELECT (auth.jwt()->>'role')::text) = 'admin');

CREATE POLICY "Allow admin delete to subcategories"
  ON merchant_subcategories
  FOR DELETE
  TO authenticated
  USING ((SELECT (auth.jwt()->>'role')::text) = 'admin');

-- =====================================================
-- PART 5: Fix Function Search Path Security
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.increment_total_savings(TEXT, NUMERIC);

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION public.increment_total_savings(
  p_user_id TEXT,
  p_amount NUMERIC
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET total_savings = COALESCE(total_savings, 0) + p_amount
  WHERE user_id = p_user_id;
END;
$$;