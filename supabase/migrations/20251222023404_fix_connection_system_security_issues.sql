/*
  # Fix Connection System and Database Security Issues

  ## Changes

  1. **Add Missing Index**
     - Add index on `promo_content.created_by` foreign key

  2. **Optimize RLS Policies (Auth Initialization)**
     - Fix `connection_invites` policies to use `(select auth.uid())`
     - Fix `user_connections` policies to use `(select auth.uid())`
     - Consolidate multiple permissive policies

  3. **Remove Unused Indexes**
     - Drop 11 unused indexes to reduce database overhead

  4. **Add Missing RLS Policies**
     - Add policies for `stripe_orders` and `stripe_subscriptions` tables

  5. **Fix Function Search Paths**
     - Update 5 functions to use explicit search_path

  ## Security
  - All policies properly scoped to authenticated users
  - Foreign key indexes ensure query performance
  - Function search paths secured against attacks
*/

-- ============================================================================
-- 1. ADD MISSING INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_promo_content_created_by 
ON promo_content(created_by);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - Connection Invites
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sent invites" ON connection_invites;
DROP POLICY IF EXISTS "Users can view received invites" ON connection_invites;
DROP POLICY IF EXISTS "Users can send invites" ON connection_invites;
DROP POLICY IF EXISTS "Users can respond to received invites" ON connection_invites;

CREATE POLICY "Users can view their invites"
  ON connection_invites FOR SELECT TO authenticated
  USING (
    sender_user_id = (select auth.uid()::text) OR 
    recipient_user_id = (select auth.uid()::text)
  );

CREATE POLICY "Users can send invites"
  ON connection_invites FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = (select auth.uid()::text));

CREATE POLICY "Users can respond to received invites"
  ON connection_invites FOR UPDATE TO authenticated
  USING (recipient_user_id = (select auth.uid()::text))
  WITH CHECK (recipient_user_id = (select auth.uid()::text));

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - User Connections
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their connections" ON user_connections;
DROP POLICY IF EXISTS "Users can create connections" ON user_connections;

CREATE POLICY "Users can view their connections"
  ON user_connections FOR SELECT TO authenticated
  USING (
    user_id_1 = (select auth.uid()::text) OR 
    user_id_2 = (select auth.uid()::text)
  );

CREATE POLICY "Users can create connections"
  ON user_connections FOR INSERT TO authenticated
  WITH CHECK (
    user_id_1 = (select auth.uid()::text) OR 
    user_id_2 = (select auth.uid()::text)
  );

-- ============================================================================
-- 4. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES - Users Table
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can lookup users by link_id for invites" ON users;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON users;

CREATE POLICY "Users can view profiles and lookup by link_id"
  ON users FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()::text) OR link_id IS NOT NULL
  );

-- ============================================================================
-- 5. REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_connection_invites_created_at;
DROP INDEX IF EXISTS idx_user_connections_user1;
DROP INDEX IF EXISTS idx_user_connections_user2;
DROP INDEX IF EXISTS idx_billing_transactions_user_id;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_fault_report_notes_admin_id;
DROP INDEX IF EXISTS idx_fault_reports_assigned_to;
DROP INDEX IF EXISTS idx_fault_reports_booking_id;
DROP INDEX IF EXISTS idx_fault_reports_order_id;
DROP INDEX IF EXISTS idx_liked_merchants_merchant_id;
DROP INDEX IF EXISTS idx_subscription_history_user_id;
DROP INDEX IF EXISTS idx_merchants_subcategory_id;

-- ============================================================================
-- 6. ADD MISSING RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own orders"
  ON stripe_orders FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT stripe_customer_id FROM users 
      WHERE user_id = (select auth.uid()::text)
    )
  );

CREATE POLICY "Users can create own orders"
  ON stripe_orders FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT stripe_customer_id FROM users 
      WHERE user_id = (select auth.uid()::text)
    )
  );

CREATE POLICY "Users can view own subscriptions"
  ON stripe_subscriptions FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT stripe_customer_id FROM users 
      WHERE user_id = (select auth.uid()::text)
    )
  );

CREATE POLICY "Users can create own subscriptions"
  ON stripe_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT stripe_customer_id FROM users 
      WHERE user_id = (select auth.uid()::text)
    )
  );

CREATE POLICY "Users can update own subscriptions"
  ON stripe_subscriptions FOR UPDATE TO authenticated
  USING (
    customer_id IN (
      SELECT stripe_customer_id FROM users 
      WHERE user_id = (select auth.uid()::text)
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT stripe_customer_id FROM users 
      WHERE user_id = (select auth.uid()::text)
    )
  );

-- ============================================================================
-- 7. FIX FUNCTION SEARCH PATHS
-- ============================================================================

DROP FUNCTION IF EXISTS validate_link_id(TEXT) CASCADE;
CREATE FUNCTION validate_link_id(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN code ~ '^[A-Z0-9]{6}$';
END;
$$;

DROP FUNCTION IF EXISTS calculate_rental_fee(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) CASCADE;
CREATE FUNCTION calculate_rental_fee(
  rental_start TIMESTAMPTZ,
  rental_end TIMESTAMPTZ,
  subscription_type TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  duration_hours NUMERIC;
  fee NUMERIC := 0;
BEGIN
  duration_hours := EXTRACT(EPOCH FROM (rental_end - rental_start)) / 3600;
  IF subscription_type IN ('plus', 'premium') THEN
    RETURN 0;
  END IF;
  IF duration_hours <= 2 THEN
    fee := 0;
  ELSIF duration_hours <= 24 THEN
    fee := 1.50;
  ELSE
    fee := 3.00 * CEIL(duration_hours / 24);
  END IF;
  RETURN fee;
END;
$$;

DROP FUNCTION IF EXISTS generate_unique_link_id() CASCADE;
CREATE FUNCTION generate_unique_link_id()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_link_id TEXT;
  exists_already BOOLEAN;
  attempts INT := 0;
  max_attempts INT := 100;
BEGIN
  LOOP
    new_link_id := UPPER(
      SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6)
    );
    SELECT EXISTS(SELECT 1 FROM users WHERE link_id = new_link_id)
    INTO exists_already;
    EXIT WHEN NOT exists_already;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique Link ID after % attempts', max_attempts;
    END IF;
  END LOOP;
  RETURN new_link_id;
END;
$$;

DROP FUNCTION IF EXISTS set_user_link_id() CASCADE;
CREATE FUNCTION set_user_link_id()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.link_id IS NULL THEN
    NEW.link_id := generate_unique_link_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_set_user_link_id ON users;
CREATE TRIGGER trigger_set_user_link_id
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_link_id();

DROP FUNCTION IF EXISTS create_user_connection(TEXT, TEXT) CASCADE;
CREATE FUNCTION create_user_connection(uid1 TEXT, uid2 TEXT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  connection_id INT;
  user1 TEXT;
  user2 TEXT;
BEGIN
  IF uid1 < uid2 THEN
    user1 := uid1;
    user2 := uid2;
  ELSE
    user1 := uid2;
    user2 := uid1;
  END IF;
  INSERT INTO user_connections (user_id_1, user_id_2)
  VALUES (user1, user2)
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING
  RETURNING id INTO connection_id;
  RETURN connection_id;
END;
$$;