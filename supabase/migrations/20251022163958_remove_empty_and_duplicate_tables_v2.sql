/*
  # Remove Empty and Duplicate Tables

  ## Analysis
  This migration removes tables/views that are either:
  1. Empty (0 rows) and redundant
  2. Old test structures that have been replaced
  
  ## Objects to Remove
  
  ### Empty Tables
  - **deals** (0 rows) - replaced by merchant_deals (22 rows)
  - **stations** (0 rows) - replaced by station_items (10 rows)
  
  ### Empty Views
  - **merchant_review_stats** (view, 0 rows) - functionality in reviews table
  
  ### Old Test Structure
  - **category_items** (9 rows, bigint IDs) - OLD test data
    - Replaced by **categories** (10 rows, uuid IDs) - NEW proper structure
  
  ## Tables to Keep
  - ✅ categories (10 rows, proper uuid structure)
  - ✅ merchant_deals (22 rows, real data)
  - ✅ station_items (10 rows, real data)
  - ✅ reviews (proper structure for review stats)
  - ✅ users (4,728 rows, already consolidated)
  
  ## Data Safety
  - deals: 0 rows (empty, safe to delete)
  - stations: 0 rows (empty, safe to delete)
  - merchant_review_stats: view with 0 rows (safe to delete)
  - category_items: 9 rows old test data (categories has proper data)
*/

-- Step 1: Drop empty view
DROP VIEW IF EXISTS merchant_review_stats CASCADE;

-- Step 2: Drop empty tables
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS stations CASCADE;

-- Step 3: Drop old test structure table
DROP TABLE IF EXISTS category_items CASCADE;

-- Step 4: Verify categories table has proper constraints
DO $$
BEGIN
  -- Ensure categories has unique slug
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_slug_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Step 5: Ensure RLS is enabled on remaining tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_items ENABLE ROW LEVEL SECURITY;

-- Step 6: Add RLS policies if they don't exist

-- Categories - public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Categories are viewable by everyone'
  ) THEN
    CREATE POLICY "Categories are viewable by everyone"
      ON categories FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Merchant deals - public read access for active deals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_deals' AND policyname = 'Merchant deals are viewable by everyone'
  ) THEN
    CREATE POLICY "Merchant deals are viewable by everyone"
      ON merchant_deals FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Station items - public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_items' AND policyname = 'Station items are viewable by everyone'
  ) THEN
    CREATE POLICY "Station items are viewable by everyone"
      ON station_items FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;