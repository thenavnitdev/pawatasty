/*
  # Fix Security Issues - Part 1: Indexes and Duplicate Policies

  1. Index Improvements
    - Add missing foreign key index for merchant_deals.merchant_id
    - Remove duplicate indexes

  2. Remove Duplicate Policies
    - Clean up duplicate permissive policies on public tables

  3. Remove Unused Indexes
    - Drop indexes that are not being used
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_merchant_deals_merchant_id 
ON merchant_deals(merchant_id);

-- ============================================================================
-- 2. REMOVE DUPLICATE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_users_phone;

-- ============================================================================
-- 3. REMOVE DUPLICATE PERMISSIVE POLICIES - CATEGORIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

-- ============================================================================
-- 4. REMOVE DUPLICATE PERMISSIVE POLICIES - MERCHANT_DEALS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view merchant deals" ON merchant_deals;
DROP POLICY IF EXISTS "Merchant deals are viewable by everyone" ON merchant_deals;

-- ============================================================================
-- 5. REMOVE DUPLICATE PERMISSIVE POLICIES - MERCHANTS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view merchants" ON merchants;

-- ============================================================================
-- 6. REMOVE DUPLICATE PERMISSIVE POLICIES - STATION_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view station items" ON station_items;
DROP POLICY IF EXISTS "Station items are viewable by everyone" ON station_items;

-- ============================================================================
-- 7. REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_users_points;
DROP INDEX IF EXISTS idx_users_referral_count;
DROP INDEX IF EXISTS idx_liked_merchants_merchant_id;
DROP INDEX IF EXISTS idx_merchants_merchant_id;
DROP INDEX IF EXISTS idx_categories_slug;
DROP INDEX IF EXISTS idx_merchants_category;
DROP INDEX IF EXISTS idx_merchants_rating;
DROP INDEX IF EXISTS idx_categories_active;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_deal_bookings_user_id;
DROP INDEX IF EXISTS idx_users_profile_completed;
DROP INDEX IF EXISTS idx_users_subscription;
DROP INDEX IF EXISTS idx_users_profile_level;
DROP INDEX IF EXISTS idx_otp_codes_expires_at;
DROP INDEX IF EXISTS idx_reviews_target;
DROP INDEX IF EXISTS idx_reviews_rating;
DROP INDEX IF EXISTS idx_reviews_created;
DROP INDEX IF EXISTS idx_reviews_user;
DROP INDEX IF EXISTS idx_liked_merchants_user_id;
DROP INDEX IF EXISTS idx_chat_messages_user_id;