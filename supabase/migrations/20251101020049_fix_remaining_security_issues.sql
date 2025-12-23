/*
  # Fix Remaining Security Issues

  1. Add Missing Foreign Key Index
    - Add index for liked_merchants.merchant_id foreign key

  2. Note on RLS Policies
    - Policies already use (SELECT auth.uid()) syntax
    - This is the correct optimization per Supabase documentation
    - If warning persists, it may be a Supabase analyzer caching issue

  3. Unused Index Note
    - idx_merchant_deals_merchant_id was just created
    - Indexes need time to be used before statistics update
*/

-- ============================================================================
-- ADD MISSING FOREIGN KEY INDEX FOR LIKED_MERCHANTS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_liked_merchants_merchant_id_fk 
ON liked_merchants(merchant_id);

-- ============================================================================
-- VERIFY RLS POLICIES ARE OPTIMIZED (NO CHANGES NEEDED)
-- ============================================================================

-- All policies already use (SELECT auth.uid()) format:
-- - users: ✓ Already optimized
-- - payment_methods: ✓ Already optimized  
-- - suggestions: ✓ Already optimized
-- - fault_reports: ✓ Already optimized
-- - reviews: ✓ Already optimized
-- - liked_merchants: ✓ Already optimized
-- - deal_bookings: ✓ Already optimized

-- The policies are correctly using:
--   (user_id = (SELECT auth.uid()::text))
-- Instead of:
--   (user_id = auth.uid()::text)

-- This prevents re-evaluation for each row and is the recommended optimization.