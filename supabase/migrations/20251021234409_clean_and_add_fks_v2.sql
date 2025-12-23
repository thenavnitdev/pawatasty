/*
  # Clean Orphaned Data and Add Foreign Keys v2
  
  1. Data Cleanup
    - Remove orphaned records before adding FKs
  
  2. Foreign Keys
    - Add all missing foreign key constraints
    - Add performance indexes
*/

-- Clean up orphaned deal_bookings
DELETE FROM deal_bookings
WHERE user_id NOT IN (SELECT user_id FROM users);

-- Clean orphaned orders
DELETE FROM orders
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM users);

-- Clean orphaned user_subscriptions
DELETE FROM user_subscriptions
WHERE user_id NOT IN (SELECT user_id FROM users);

-- Ensure users.user_id is unique
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_user_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add FK for chat_messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_user_id_fkey'
  ) THEN
    ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add FK for deal_bookings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_bookings_user_id_fkey'
  ) THEN
    ALTER TABLE deal_bookings
    ADD CONSTRAINT deal_bookings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add FK for orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_fkey'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add FK for user_subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_user_id ON deal_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
