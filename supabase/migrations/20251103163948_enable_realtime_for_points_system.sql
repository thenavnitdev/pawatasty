/*
  # Enable Realtime for Points System

  ## Summary
  Enables Supabase Realtime for users and points_transactions tables
  to allow instant UI updates when points change.

  ## Changes
  1. Enable realtime replication for users table
  2. Enable realtime replication for points_transactions table

  ## Benefits
  - Instant UI updates when points are awarded
  - No manual refresh needed
  - Better user experience
*/

-- Enable realtime for users table
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Enable realtime for points_transactions table
ALTER TABLE points_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE points_transactions;
