/*
  # Fix Security Issues - Comprehensive Security Hardening

  This migration addresses all security issues identified in the database audit:

  ## 1. Foreign Key Indexes (Performance)
  - Add indexes for all unindexed foreign keys to improve query performance
  - Tables affected: billing_transactions, events, fault_report_notes, fault_reports, 
    liked_merchants, merchant_deals, subscription_history

  ## 2. RLS Policy Optimization (Performance)
  - Fix auth function calls in RLS policies to use subquery pattern
  - Prevents re-evaluation for each row, dramatically improves performance
  - Tables affected: user_memberships, billing_transactions, rental_sessions, 
    membership_pricing, subscription_history, events, idempotency_keys

  ## 3. Multiple Permissive Policies (Security)
  - Consolidate overlapping policies to eliminate redundancy
  - Tables affected: billing_transactions, events, membership_pricing, rental_sessions

  ## 4. Remove Unused Indexes (Maintenance)
  - Drop indexes that have never been used to reduce storage and maintenance overhead
  - Indexes: idx_user_memberships_lookup, idx_billing_transactions_recent, 
    idx_rental_sessions_active, idx_events_lookup, idx_users_validation_fee_paid

  ## 5. Function Security (Security)
  - Fix mutable search_path in calculate_rental_billing function

  ## Security Notes
  - All changes maintain existing functionality while improving performance
  - No data loss or breaking changes
  - Policies are consolidated while maintaining same access control logic
*/

-- ============================================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- billing_transactions indexes
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id 
  ON billing_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_rental_session_id 
  ON billing_transactions(rental_session_id);

-- events indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id 
  ON events(user_id);

CREATE INDEX IF NOT EXISTS idx_events_rental_session_id 
  ON events(rental_session_id);

-- fault_report_notes indexes
CREATE INDEX IF NOT EXISTS idx_fault_report_notes_fault_report_id 
  ON fault_report_notes(fault_report_id);

CREATE INDEX IF NOT EXISTS idx_fault_report_notes_admin_id 
  ON fault_report_notes(admin_id);

-- fault_reports indexes
CREATE INDEX IF NOT EXISTS idx_fault_reports_assigned_to 
  ON fault_reports(assigned_to);

-- liked_merchants indexes
CREATE INDEX IF NOT EXISTS idx_liked_merchants_merchant_id 
  ON liked_merchants(merchant_id);

CREATE INDEX IF NOT EXISTS idx_liked_merchants_user_id 
  ON liked_merchants(user_id);

-- merchant_deals indexes
CREATE INDEX IF NOT EXISTS idx_merchant_deals_merchant_id 
  ON merchant_deals(merchant_id);

-- subscription_history indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id 
  ON subscription_history(user_id);

-- ============================================================================
-- PART 2: REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_user_memberships_lookup;
DROP INDEX IF EXISTS idx_billing_transactions_recent;
DROP INDEX IF EXISTS idx_rental_sessions_active;
DROP INDEX IF EXISTS idx_events_lookup;
DROP INDEX IF EXISTS idx_users_validation_fee_paid;

-- ============================================================================
-- PART 3: OPTIMIZE RLS POLICIES - user_memberships
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users and admins can view memberships" ON user_memberships;
DROP POLICY IF EXISTS "Users and admins can update memberships" ON user_memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON user_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON user_memberships;

-- Recreate with optimized auth function calls
CREATE POLICY "Users and admins can view memberships"
  ON user_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Users and admins can update memberships"
  ON user_memberships
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Admins can insert memberships"
  ON user_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Admins can delete memberships"
  ON user_memberships
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 4: CONSOLIDATE AND OPTIMIZE RLS POLICIES - billing_transactions
-- ============================================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Users and admins can view transactions" ON billing_transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON billing_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON billing_transactions;

-- Create single consolidated SELECT policy
CREATE POLICY "View own or admin view all transactions"
  ON billing_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- Create admin management policies
CREATE POLICY "Admins can insert transactions"
  ON billing_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Admins can update transactions"
  ON billing_transactions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Admins can delete transactions"
  ON billing_transactions
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 5: CONSOLIDATE AND OPTIMIZE RLS POLICIES - rental_sessions
-- ============================================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Users and admins can view rental sessions" ON rental_sessions;
DROP POLICY IF EXISTS "Admins can manage rental sessions" ON rental_sessions;
DROP POLICY IF EXISTS "Users can insert their rental sessions" ON rental_sessions;
DROP POLICY IF EXISTS "Users can update their rental sessions" ON rental_sessions;

-- Create single consolidated SELECT policy
CREATE POLICY "View own or admin view all sessions"
  ON rental_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- Create user insert policy
CREATE POLICY "Users can create rental sessions"
  ON rental_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.jwt()->>'user_id')
  );

-- Create user update policy
CREATE POLICY "Users can update own sessions"
  ON rental_sessions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- Create admin delete policy
CREATE POLICY "Admins can delete sessions"
  ON rental_sessions
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 6: CONSOLIDATE AND OPTIMIZE RLS POLICIES - membership_pricing
-- ============================================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Everyone can view pricing" ON membership_pricing;
DROP POLICY IF EXISTS "Admins can manage pricing operations" ON membership_pricing;

-- Create single SELECT policy (everyone can read)
CREATE POLICY "Anyone can view pricing"
  ON membership_pricing
  FOR SELECT
  TO authenticated
  USING (true);

-- Create admin management policies
CREATE POLICY "Admins can manage pricing"
  ON membership_pricing
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 7: OPTIMIZE RLS POLICIES - subscription_history
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users and admins can view subscription history" ON subscription_history;
DROP POLICY IF EXISTS "Admins can insert subscription history" ON subscription_history;

-- Recreate with optimized auth function calls
CREATE POLICY "View own or admin view all history"
  ON subscription_history
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Admins can insert history"
  ON subscription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 8: CONSOLIDATE AND OPTIMIZE RLS POLICIES - events
-- ============================================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Users and admins can view events" ON events;
DROP POLICY IF EXISTS "Admins can manage events operations" ON events;
DROP POLICY IF EXISTS "System can insert events" ON events;

-- Create single consolidated SELECT policy
CREATE POLICY "View own or admin view all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.jwt()->>'user_id')
    OR 
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- Create admin management policies
CREATE POLICY "System can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage events"
  ON events
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 9: OPTIMIZE RLS POLICIES - idempotency_keys
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage idempotency operations" ON idempotency_keys;

-- Recreate with optimized auth function calls
CREATE POLICY "Admins can manage idempotency"
  ON idempotency_keys
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- ============================================================================
-- PART 10: FIX FUNCTION SEARCH PATH
-- ============================================================================

-- Drop and recreate calculate_rental_billing with immutable search_path
DROP FUNCTION IF EXISTS calculate_rental_billing(uuid);

CREATE OR REPLACE FUNCTION calculate_rental_billing(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session rental_sessions%ROWTYPE;
  v_membership user_memberships%ROWTYPE;
  v_pricing membership_pricing%ROWTYPE;
  v_minutes integer;
  v_billable_minutes integer;
  v_blocks integer;
  v_usage_fee integer;
  v_validation_fee integer;
  v_total_fee integer;
BEGIN
  -- Get rental session
  SELECT * INTO v_session
  FROM rental_sessions
  WHERE id = session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental session not found';
  END IF;

  -- Get user membership
  SELECT * INTO v_membership
  FROM user_memberships
  WHERE user_id = v_session.user_id;

  -- Get pricing for membership tier
  SELECT * INTO v_pricing
  FROM membership_pricing
  WHERE tier = v_membership.membership_tier;

  -- Calculate total minutes
  v_minutes := EXTRACT(EPOCH FROM (v_session.end_time - v_session.start_time)) / 60;

  -- Calculate billable minutes (after free minutes)
  v_billable_minutes := GREATEST(0, v_minutes - v_pricing.daily_free_minutes);

  -- Calculate billing blocks
  v_blocks := CEIL(v_billable_minutes::numeric / v_pricing.usage_interval_minutes);

  -- Calculate usage fee
  v_usage_fee := LEAST(v_blocks * v_pricing.usage_rate_cents, v_pricing.daily_cap_cents);

  -- Validation fee (if not yet paid)
  v_validation_fee := CASE 
    WHEN v_membership.validation_fee_paid THEN 0 
    ELSE v_pricing.validation_fee_cents 
  END;

  -- Total fee
  v_total_fee := v_usage_fee + v_validation_fee;

  -- Update rental session
  UPDATE rental_sessions
  SET
    total_minutes = v_minutes,
    free_minutes_applied = LEAST(v_minutes, v_pricing.daily_free_minutes),
    billable_minutes = v_billable_minutes,
    billing_blocks = v_blocks,
    daily_cap_applied = (v_usage_fee = v_pricing.daily_cap_cents),
    validation_fee_cents = v_validation_fee,
    usage_fee_cents = v_usage_fee,
    total_fee_cents = v_total_fee,
    updated_at = now()
  WHERE id = session_id;

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_rental_billing(uuid) TO authenticated;

-- ============================================================================
-- VERIFICATION AND OPTIMIZATION
-- ============================================================================

-- Analyze tables to update statistics for query planner
ANALYZE billing_transactions;
ANALYZE events;
ANALYZE fault_report_notes;
ANALYZE fault_reports;
ANALYZE liked_merchants;
ANALYZE merchant_deals;
ANALYZE subscription_history;
ANALYZE user_memberships;
ANALYZE rental_sessions;
ANALYZE membership_pricing;
ANALYZE idempotency_keys;

-- Add helpful comments
COMMENT ON INDEX idx_billing_transactions_user_id IS 'Improves queries filtering by user_id (FK index)';
COMMENT ON INDEX idx_events_user_id IS 'Improves queries filtering by user_id (FK index)';
COMMENT ON INDEX idx_fault_reports_assigned_to IS 'Improves queries filtering by assigned admin (FK index)';
COMMENT ON INDEX idx_liked_merchants_merchant_id IS 'Improves queries filtering by merchant_id (FK index)';
COMMENT ON INDEX idx_merchant_deals_merchant_id IS 'Improves queries filtering by merchant_id (FK index)';
COMMENT ON INDEX idx_subscription_history_user_id IS 'Improves queries filtering by user_id (FK index)';
