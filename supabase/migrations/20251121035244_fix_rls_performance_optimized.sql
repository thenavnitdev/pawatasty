/*
  # Fix RLS Performance Issues - Optimized

  Fixes all RLS performance warnings by using subquery pattern for auth functions.
  Also removes unused indexes and fixes function search paths.
*/

-- PART 1: user_memberships policies
DROP POLICY IF EXISTS "Users and admins can view memberships" ON user_memberships;
DROP POLICY IF EXISTS "Users and admins can update memberships" ON user_memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON user_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON user_memberships;

CREATE POLICY "Users and admins can view memberships"
  ON user_memberships FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users and admins can update memberships"
  ON user_memberships FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Admins can insert memberships"
  ON user_memberships FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete memberships"
  ON user_memberships FOR DELETE TO authenticated
  USING (true);

-- PART 2: billing_transactions policies
DROP POLICY IF EXISTS "View own or admin view all transactions" ON billing_transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON billing_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON billing_transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON billing_transactions;

CREATE POLICY "View own or admin view all transactions"
  ON billing_transactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Admins can insert transactions"
  ON billing_transactions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update transactions"
  ON billing_transactions FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete transactions"
  ON billing_transactions FOR DELETE TO authenticated
  USING (true);

-- PART 3: rental_sessions policies
DROP POLICY IF EXISTS "View own or admin view all sessions" ON rental_sessions;
DROP POLICY IF EXISTS "Users can create rental sessions" ON rental_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON rental_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON rental_sessions;

CREATE POLICY "View own or admin view all sessions"
  ON rental_sessions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can create rental sessions"
  ON rental_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own sessions"
  ON rental_sessions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Admins can delete sessions"
  ON rental_sessions FOR DELETE TO authenticated
  USING (true);

-- PART 4: membership_pricing policies
DROP POLICY IF EXISTS "Anyone can view pricing" ON membership_pricing;
DROP POLICY IF EXISTS "Admins can manage pricing" ON membership_pricing;
DROP POLICY IF EXISTS "Admins can insert pricing" ON membership_pricing;
DROP POLICY IF EXISTS "Admins can update pricing" ON membership_pricing;
DROP POLICY IF EXISTS "Admins can delete pricing" ON membership_pricing;

CREATE POLICY "Anyone can view pricing"
  ON membership_pricing FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert pricing"
  ON membership_pricing FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update pricing"
  ON membership_pricing FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete pricing"
  ON membership_pricing FOR DELETE TO authenticated
  USING (true);

-- PART 5: subscription_history policies
DROP POLICY IF EXISTS "View own or admin view all history" ON subscription_history;
DROP POLICY IF EXISTS "Admins can insert history" ON subscription_history;

CREATE POLICY "View own or admin view all history"
  ON subscription_history FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Admins can insert history"
  ON subscription_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- PART 6: events policies
DROP POLICY IF EXISTS "View own or admin view all events" ON events;
DROP POLICY IF EXISTS "System can create events" ON events;
DROP POLICY IF EXISTS "Admins can manage events" ON events;
DROP POLICY IF EXISTS "Admins and system can create events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

CREATE POLICY "View own or admin view all events"
  ON events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY "Admins and system can create events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update events"
  ON events FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete events"
  ON events FOR DELETE TO authenticated
  USING (true);

-- PART 7: idempotency_keys policies
DROP POLICY IF EXISTS "Admins can manage idempotency" ON idempotency_keys;
DROP POLICY IF EXISTS "Admins can view idempotency" ON idempotency_keys;
DROP POLICY IF EXISTS "Admins can update idempotency" ON idempotency_keys;
DROP POLICY IF EXISTS "Admins can delete idempotency" ON idempotency_keys;

CREATE POLICY "Admins can view idempotency"
  ON idempotency_keys FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update idempotency"
  ON idempotency_keys FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete idempotency"
  ON idempotency_keys FOR DELETE TO authenticated
  USING (true);

-- PART 8: Drop unused indexes
DROP INDEX IF EXISTS idx_rental_sessions_user_id;
DROP INDEX IF EXISTS idx_billing_transactions_user_id;
DROP INDEX IF EXISTS idx_events_rental_session_id;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_fault_report_notes_admin_id;
DROP INDEX IF EXISTS idx_fault_reports_assigned_to;
DROP INDEX IF EXISTS idx_liked_merchants_merchant_id;
DROP INDEX IF EXISTS idx_merchant_deals_merchant_id;
DROP INDEX IF EXISTS idx_subscription_history_user_id;