/*
  # Remove Unused Indexes and Security Configuration

  ## Changes Made
  
  ### 1. Remove Unused Indexes
  Removes indexes that are not being used by any queries to:
  - Reduce storage overhead
  - Improve write performance (INSERT, UPDATE, DELETE)
  - Reduce maintenance overhead
  
  The following unused indexes will be removed:
  - idx_fault_reports_assigned_to
  - idx_fault_reports_booking_id
  - idx_fault_reports_order_id
  - idx_liked_merchants_merchant_id
  - idx_merchants_subcategory_id
  - idx_rental_sessions_user_id
  - idx_subscription_history_user_id
  - idx_billing_transactions_user_id
  - idx_events_rental_session_id
  - idx_events_user_id
  - idx_fault_report_notes_admin_id

  ### 2. Password Leak Protection
  Note: Password leak protection must be enabled manually in Supabase Dashboard:
  1. Go to Authentication > Settings
  2. Find "Password leak protection"
  3. Enable the toggle
  
  This feature checks passwords against the HaveIBeenPwned database to prevent
  users from using compromised passwords.

  ### 3. RLS Policy Performance
  All RLS policies have been previously optimized to use subqueries:
  - payment_methods: Uses (SELECT auth.uid()::text)
  - orders: Uses (SELECT auth.uid()::text) and (SELECT auth.jwt()->>'role')
  - merchant_subcategories: Uses (SELECT auth.jwt()->>'role')
  
  This prevents re-evaluation of auth functions for each row.
*/

-- =====================================================
-- Remove Unused Indexes
-- =====================================================

-- Drop unused indexes to improve write performance
DROP INDEX IF EXISTS idx_fault_reports_assigned_to;
DROP INDEX IF EXISTS idx_fault_reports_booking_id;
DROP INDEX IF EXISTS idx_fault_reports_order_id;
DROP INDEX IF EXISTS idx_liked_merchants_merchant_id;
DROP INDEX IF EXISTS idx_merchants_subcategory_id;
DROP INDEX IF EXISTS idx_rental_sessions_user_id;
DROP INDEX IF EXISTS idx_subscription_history_user_id;
DROP INDEX IF EXISTS idx_billing_transactions_user_id;
DROP INDEX IF EXISTS idx_events_rental_session_id;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_fault_report_notes_admin_id;

-- =====================================================
-- Verification Query (for manual testing)
-- =====================================================

-- Run this query to verify indexes have been removed:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_fault_reports_assigned_to',
--     'idx_fault_reports_booking_id',
--     'idx_fault_reports_order_id',
--     'idx_liked_merchants_merchant_id',
--     'idx_merchants_subcategory_id',
--     'idx_rental_sessions_user_id',
--     'idx_subscription_history_user_id',
--     'idx_billing_transactions_user_id',
--     'idx_events_rental_session_id',
--     'idx_events_user_id',
--     'idx_fault_report_notes_admin_id'
--   );
-- (Should return 0 rows)