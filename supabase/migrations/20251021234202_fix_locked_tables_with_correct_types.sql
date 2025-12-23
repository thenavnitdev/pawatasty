/*
  # Fix All Locked Tables - Add RLS Policies (Correct Data Types)
  
  1. Tables Fixed (16 remaining)
    All locked tables now get appropriate RLS policies based on their actual column data types
  
  2. Security
    - User-specific data: Users can only access their own records
    - Public data: Anyone can read, authenticated can write
    - Proper type casting for bigint vs text vs uuid columns
  
  3. Data Type Handling
    - suggestions.user_id = text -> use auth.uid()::text
    - fault_reports.user_id = text -> use auth.uid()::text
    - transactions.user_id = bigint -> disable RLS (no proper mapping)
    - referrals.referrer_id = bigint -> disable RLS (no proper mapping)
    - session table has no user_id column -> disable RLS
*/

-- =====================================================
-- SUGGESTIONS TABLE (user_id = text)
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'suggestions' AND policyname = 'Users can create own suggestions'
  ) THEN
    CREATE POLICY "Users can create own suggestions"
      ON suggestions FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'suggestions' AND policyname = 'Users can view own suggestions'
  ) THEN
    CREATE POLICY "Users can view own suggestions"
      ON suggestions FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'suggestions' AND policyname = 'Users can update own suggestions'
  ) THEN
    CREATE POLICY "Users can update own suggestions"
      ON suggestions FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- =====================================================
-- FAULT_REPORTS TABLE (user_id = text)
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fault_reports' AND policyname = 'Users can create own fault reports'
  ) THEN
    CREATE POLICY "Users can create own fault reports"
      ON fault_reports FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fault_reports' AND policyname = 'Users can view own fault reports'
  ) THEN
    CREATE POLICY "Users can view own fault reports"
      ON fault_reports FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

-- =====================================================
-- FILES_STORAGE TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'files_storage' AND policyname = 'Anyone can view files'
  ) THEN
    CREATE POLICY "Anyone can view files"
      ON files_storage FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'files_storage' AND policyname = 'Authenticated users can upload files'
  ) THEN
    CREATE POLICY "Authenticated users can upload files"
      ON files_storage FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- BRANDS_PARTNERS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brands_partners' AND policyname = 'Anyone can view brands and partners'
  ) THEN
    CREATE POLICY "Anyone can view brands and partners"
      ON brands_partners FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brands_partners' AND policyname = 'Authenticated users can manage brands'
  ) THEN
    CREATE POLICY "Authenticated users can manage brands"
      ON brands_partners FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brands_partners' AND policyname = 'Authenticated users can update brands'
  ) THEN
    CREATE POLICY "Authenticated users can update brands"
      ON brands_partners FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- CATEGORY_ITEMS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'category_items' AND policyname = 'Anyone can view category items'
  ) THEN
    CREATE POLICY "Anyone can view category items"
      ON category_items FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'category_items' AND policyname = 'Authenticated users can manage category items'
  ) THEN
    CREATE POLICY "Authenticated users can manage category items"
      ON category_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'category_items' AND policyname = 'Authenticated users can update category items'
  ) THEN
    CREATE POLICY "Authenticated users can update category items"
      ON category_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- DASHBOARD_STATS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dashboard_stats' AND policyname = 'Anyone can view dashboard stats'
  ) THEN
    CREATE POLICY "Anyone can view dashboard stats"
      ON dashboard_stats FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dashboard_stats' AND policyname = 'Authenticated users can manage stats'
  ) THEN
    CREATE POLICY "Authenticated users can manage stats"
      ON dashboard_stats FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dashboard_stats' AND policyname = 'Authenticated users can update stats'
  ) THEN
    CREATE POLICY "Authenticated users can update stats"
      ON dashboard_stats FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- INVENTORY_ITEMS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Anyone can view inventory'
  ) THEN
    CREATE POLICY "Anyone can view inventory"
      ON inventory_items FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Authenticated users can manage inventory'
  ) THEN
    CREATE POLICY "Authenticated users can manage inventory"
      ON inventory_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Authenticated users can update inventory'
  ) THEN
    CREATE POLICY "Authenticated users can update inventory"
      ON inventory_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- MERCHANT_BRANCHES TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_branches' AND policyname = 'Anyone can view merchant branches'
  ) THEN
    CREATE POLICY "Anyone can view merchant branches"
      ON merchant_branches FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_branches' AND policyname = 'Authenticated users can manage branches'
  ) THEN
    CREATE POLICY "Authenticated users can manage branches"
      ON merchant_branches FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_branches' AND policyname = 'Authenticated users can update branches'
  ) THEN
    CREATE POLICY "Authenticated users can update branches"
      ON merchant_branches FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- MERCHANT_DEALS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_deals' AND policyname = 'Anyone can view merchant deals'
  ) THEN
    CREATE POLICY "Anyone can view merchant deals"
      ON merchant_deals FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_deals' AND policyname = 'Authenticated users can manage merchant deals'
  ) THEN
    CREATE POLICY "Authenticated users can manage merchant deals"
      ON merchant_deals FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_deals' AND policyname = 'Authenticated users can update merchant deals'
  ) THEN
    CREATE POLICY "Authenticated users can update merchant deals"
      ON merchant_deals FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- MERCHANT_MENU_ITEMS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_menu_items' AND policyname = 'Anyone can view menu items'
  ) THEN
    CREATE POLICY "Anyone can view menu items"
      ON merchant_menu_items FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_menu_items' AND policyname = 'Authenticated users can manage menu items'
  ) THEN
    CREATE POLICY "Authenticated users can manage menu items"
      ON merchant_menu_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchant_menu_items' AND policyname = 'Authenticated users can update menu items'
  ) THEN
    CREATE POLICY "Authenticated users can update menu items"
      ON merchant_menu_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- OPERATORS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'operators' AND policyname = 'Authenticated users can view operators'
  ) THEN
    CREATE POLICY "Authenticated users can view operators"
      ON operators FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'operators' AND policyname = 'Authenticated users can manage operators'
  ) THEN
    CREATE POLICY "Authenticated users can manage operators"
      ON operators FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'operators' AND policyname = 'Authenticated users can update operators'
  ) THEN
    CREATE POLICY "Authenticated users can update operators"
      ON operators FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- POWERBANK_ITEMS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'powerbank_items' AND policyname = 'Anyone can view powerbank items'
  ) THEN
    CREATE POLICY "Anyone can view powerbank items"
      ON powerbank_items FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'powerbank_items' AND policyname = 'Authenticated users can manage powerbank items'
  ) THEN
    CREATE POLICY "Authenticated users can manage powerbank items"
      ON powerbank_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'powerbank_items' AND policyname = 'Authenticated users can update powerbank items'
  ) THEN
    CREATE POLICY "Authenticated users can update powerbank items"
      ON powerbank_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- REFERRALS TABLE (referrer_id = bigint, no UUID mapping - disable RLS)
-- =====================================================
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- SESSION TABLE (no user_id column - disable RLS)
-- =====================================================
ALTER TABLE session DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STATION_ITEMS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_items' AND policyname = 'Anyone can view station items'
  ) THEN
    CREATE POLICY "Anyone can view station items"
      ON station_items FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_items' AND policyname = 'Authenticated users can manage station items'
  ) THEN
    CREATE POLICY "Authenticated users can manage station items"
      ON station_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_items' AND policyname = 'Authenticated users can update station items'
  ) THEN
    CREATE POLICY "Authenticated users can update station items"
      ON station_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- SUBSCRIPTION_PLANS TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Anyone can view subscription plans'
  ) THEN
    CREATE POLICY "Anyone can view subscription plans"
      ON subscription_plans FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Authenticated users can manage plans'
  ) THEN
    CREATE POLICY "Authenticated users can manage plans"
      ON subscription_plans FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Authenticated users can update plans'
  ) THEN
    CREATE POLICY "Authenticated users can update plans"
      ON subscription_plans FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- TRANSACTIONS TABLE (user_id = bigint, no UUID mapping - disable RLS)
-- =====================================================
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- WAREHOUSES TABLE
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'Authenticated users can view warehouses'
  ) THEN
    CREATE POLICY "Authenticated users can view warehouses"
      ON warehouses FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'Authenticated users can manage warehouses'
  ) THEN
    CREATE POLICY "Authenticated users can manage warehouses"
      ON warehouses FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'Authenticated users can update warehouses'
  ) THEN
    CREATE POLICY "Authenticated users can update warehouses"
      ON warehouses FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
