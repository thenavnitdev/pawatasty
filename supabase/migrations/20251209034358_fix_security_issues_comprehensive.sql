/*
  # Fix Security Issues - Comprehensive Update

  ## Changes
  
  ### 1. Add Missing Indexes for Foreign Keys
  - billing_transactions.user_id
  - events.user_id
  - fault_report_notes.admin_id
  - fault_reports.assigned_to, booking_id, order_id
  - liked_merchants.merchant_id
  - merchants.subcategory_id
  - subscription_history.user_id

  ### 2. Optimize RLS Policies (Auth Function Initialization)
  - Replace auth.uid() with (select auth.uid()) for performance
  - Affects: rentals, orders, merchant_subcategories, payment_methods
  
  ### 3. Fix Function Search Path
  - Update calculate_rental_fee function with immutable search_path
  
  ## Performance Impact
  - Indexes: Significant improvement on foreign key joins
  - RLS: Prevents per-row auth function evaluation
  - Function: Security enhancement
*/

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

-- Billing transactions
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id 
ON billing_transactions(user_id);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_user_id 
ON events(user_id);

-- Fault report notes
CREATE INDEX IF NOT EXISTS idx_fault_report_notes_admin_id 
ON fault_report_notes(admin_id);

-- Fault reports
CREATE INDEX IF NOT EXISTS idx_fault_reports_assigned_to 
ON fault_reports(assigned_to);

CREATE INDEX IF NOT EXISTS idx_fault_reports_booking_id 
ON fault_reports(booking_id);

CREATE INDEX IF NOT EXISTS idx_fault_reports_order_id 
ON fault_reports(order_id);

-- Liked merchants
CREATE INDEX IF NOT EXISTS idx_liked_merchants_merchant_id 
ON liked_merchants(merchant_id);

-- Merchants
CREATE INDEX IF NOT EXISTS idx_merchants_subcategory_id 
ON merchants(subcategory_id);

-- Subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id 
ON subscription_history(user_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - RENTALS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can update own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can view own rentals" ON rentals;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can create own rentals"
ON rentals
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own rentals"
ON rentals
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()::text))
WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can view own rentals"
ON rentals
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()::text));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - ORDERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own orders" ON orders;

CREATE POLICY "Users can view own orders"
ON orders
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()::text));

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - MERCHANT_SUBCATEGORIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Allow admin delete to subcategories" ON merchant_subcategories;
DROP POLICY IF EXISTS "Allow admin insert to subcategories" ON merchant_subcategories;
DROP POLICY IF EXISTS "Allow admin update to subcategories" ON merchant_subcategories;

CREATE POLICY "Allow admin delete to subcategories"
ON merchant_subcategories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid()::text)
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Allow admin insert to subcategories"
ON merchant_subcategories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid()::text)
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Allow admin update to subcategories"
ON merchant_subcategories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid()::text)
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid()::text)
    AND admin_users.is_active = true
  )
);

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - PAYMENT_METHODS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;

CREATE POLICY "Users can delete own payment methods"
ON payment_methods
FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()::text));

CREATE POLICY "Users can insert own payment methods"
ON payment_methods
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can update own payment methods"
ON payment_methods
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()::text))
WITH CHECK (user_id = (select auth.uid()::text));

CREATE POLICY "Users can view own payment methods"
ON payment_methods
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()::text));

-- =====================================================
-- 6. FIX FUNCTION SEARCH PATH
-- =====================================================

-- Drop and recreate the calculate_rental_fee function with proper search path
DROP FUNCTION IF EXISTS calculate_rental_fee(bigint, text);

CREATE OR REPLACE FUNCTION calculate_rental_fee(
  rental_minutes bigint,
  membership_tier text
)
RETURNS TABLE (
  base_fee numeric,
  free_minutes_applied bigint,
  billable_minutes bigint,
  daily_cap_applied boolean,
  total_fee numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pricing RECORD;
  v_rate_per_interval numeric;
  v_daily_cap numeric;
  v_free_minutes bigint;
  v_billable_minutes bigint;
  v_intervals bigint;
  v_calculated_fee numeric;
  v_cap_applied boolean := false;
BEGIN
  -- Get pricing for tier
  SELECT 
    usage_rate_cents,
    usage_interval_minutes,
    daily_cap_cents,
    daily_free_minutes
  INTO v_pricing
  FROM membership_pricing
  WHERE tier = membership_tier;

  -- Default values if tier not found
  IF NOT FOUND THEN
    v_pricing.usage_rate_cents := 100;
    v_pricing.usage_interval_minutes := 30;
    v_pricing.daily_cap_cents := 500;
    v_pricing.daily_free_minutes := 0;
  END IF;

  -- Convert to decimal euros
  v_rate_per_interval := v_pricing.usage_rate_cents / 100.0;
  v_daily_cap := v_pricing.daily_cap_cents / 100.0;
  v_free_minutes := v_pricing.daily_free_minutes;

  -- Calculate billable minutes
  v_billable_minutes := GREATEST(0, rental_minutes - v_free_minutes);

  -- Calculate intervals (round up)
  v_intervals := CEILING(v_billable_minutes::numeric / v_pricing.usage_interval_minutes);

  -- Calculate fee
  v_calculated_fee := v_intervals * v_rate_per_interval;

  -- Apply daily cap if exceeded
  IF v_calculated_fee > v_daily_cap THEN
    v_calculated_fee := v_daily_cap;
    v_cap_applied := true;
  END IF;

  RETURN QUERY SELECT
    (v_intervals * v_rate_per_interval)::numeric as base_fee,
    v_free_minutes as free_minutes_applied,
    v_billable_minutes as billable_minutes,
    v_cap_applied as daily_cap_applied,
    v_calculated_fee as total_fee;
END;
$$;

-- =====================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_billing_transactions_user_id IS 
  'Performance index for billing_transactions foreign key lookups';

COMMENT ON INDEX idx_events_user_id IS 
  'Performance index for events foreign key lookups';

COMMENT ON INDEX idx_fault_report_notes_admin_id IS 
  'Performance index for fault_report_notes foreign key lookups';

COMMENT ON INDEX idx_fault_reports_assigned_to IS 
  'Performance index for fault_reports assigned_to foreign key lookups';

COMMENT ON INDEX idx_fault_reports_booking_id IS 
  'Performance index for fault_reports booking_id foreign key lookups';

COMMENT ON INDEX idx_fault_reports_order_id IS 
  'Performance index for fault_reports order_id foreign key lookups';

COMMENT ON INDEX idx_liked_merchants_merchant_id IS 
  'Performance index for liked_merchants foreign key lookups';

COMMENT ON INDEX idx_merchants_subcategory_id IS 
  'Performance index for merchants subcategory foreign key lookups';

COMMENT ON INDEX idx_subscription_history_user_id IS 
  'Performance index for subscription_history foreign key lookups';