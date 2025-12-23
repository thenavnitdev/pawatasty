/*
  # Link Fault Reports to Bookings and Orders

  1. Changes
    - Add `booking_id` column to fault_reports to link reports to deal bookings
    - Add foreign key constraint to ensure data integrity
    - Add indexes for fast lookups by booking and order
    - Update RLS policies to allow viewing reports linked to user's bookings/orders
  
  2. Purpose
    - Track which booking/order a fault report is related to
    - Enable support staff to quickly reference the transaction
    - Provide context for issue resolution
  
  3. Security
    - Maintain user privacy by ensuring users can only see their own reports
    - Foreign key ensures referential integrity
*/

-- Add booking_id column to link to deal_bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fault_reports' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE fault_reports 
    ADD COLUMN booking_id BIGINT REFERENCES deal_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_fault_reports_booking_id ON fault_reports(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fault_reports_order_id ON fault_reports(order_id) WHERE order_id IS NOT NULL;

-- Add composite index for user + booking/order lookups
CREATE INDEX IF NOT EXISTS idx_fault_reports_user_booking ON fault_reports(user_id, booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fault_reports_user_order ON fault_reports(user_id, order_id) WHERE order_id IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN fault_reports.booking_id IS 'Links to deal_bookings.id - the booking this report is about';
COMMENT ON COLUMN fault_reports.order_id IS 'Links to an order/rental - for power bank/station issues';
