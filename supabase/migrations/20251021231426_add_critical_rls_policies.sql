/*
  # Add Critical Missing RLS Policies
  
  1. Tables Affected
    - orders - Add user access policies
    - payment_methods - Add user access policies  
    - user_subscriptions - Add user access policies
    - points_transactions - Add user access policies
    - deal_bookings - Enable RLS and add policies
  
  2. Security
    - All policies restrict access to authenticated users
    - Users can only access their own data via auth.uid()::text check
    - All user_id columns are text type, so auth.uid() is cast to text
*/

-- Orders table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Users can view own orders'
  ) THEN
    CREATE POLICY "Users can view own orders" ON orders
      FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Users can create own orders'
  ) THEN
    CREATE POLICY "Users can create own orders" ON orders
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Users can update own orders'
  ) THEN
    CREATE POLICY "Users can update own orders" ON orders
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Payment methods table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Users can view own payment methods'
  ) THEN
    CREATE POLICY "Users can view own payment methods" ON payment_methods
      FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Users can add payment methods'
  ) THEN
    CREATE POLICY "Users can add payment methods" ON payment_methods
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Users can update own payment methods'
  ) THEN
    CREATE POLICY "Users can update own payment methods" ON payment_methods
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Users can delete own payment methods'
  ) THEN
    CREATE POLICY "Users can delete own payment methods" ON payment_methods
      FOR DELETE TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

-- User subscriptions table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can view own subscriptions'
  ) THEN
    CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
      FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can create own subscriptions'
  ) THEN
    CREATE POLICY "Users can create own subscriptions" ON user_subscriptions
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can update own subscriptions'
  ) THEN
    CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Points transactions table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'points_transactions' 
    AND policyname = 'Users can view own points transactions'
  ) THEN
    CREATE POLICY "Users can view own points transactions" ON points_transactions
      FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'points_transactions' 
    AND policyname = 'Users can create points transactions'
  ) THEN
    CREATE POLICY "Users can create points transactions" ON points_transactions
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Deal bookings table - enable RLS and add policies
ALTER TABLE deal_bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_bookings' 
    AND policyname = 'Users can view own bookings'
  ) THEN
    CREATE POLICY "Users can view own bookings" ON deal_bookings
      FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_bookings' 
    AND policyname = 'Users can create own bookings'
  ) THEN
    CREATE POLICY "Users can create own bookings" ON deal_bookings
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_bookings' 
    AND policyname = 'Users can update own bookings'
  ) THEN
    CREATE POLICY "Users can update own bookings" ON deal_bookings
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_bookings' 
    AND policyname = 'Users can delete own bookings'
  ) THEN
    CREATE POLICY "Users can delete own bookings" ON deal_bookings
      FOR DELETE TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;