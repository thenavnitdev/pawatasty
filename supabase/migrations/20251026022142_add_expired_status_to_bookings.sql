/*
  # Add expired status to deal bookings

  1. Changes
    - Add 'expired' as a valid status for deal_bookings table
    - Allows bookings to be marked as expired when past their date/time

  2. Status Values
    - confirmed: Active booking
    - cancelled: User cancelled booking
    - completed: Booking was redeemed/used
    - expired: Booking date/time has passed without redemption
*/

-- Drop the existing CHECK constraint
ALTER TABLE deal_bookings DROP CONSTRAINT IF EXISTS deal_bookings_status_check;

-- Add new CHECK constraint with 'expired' status
ALTER TABLE deal_bookings ADD CONSTRAINT deal_bookings_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'completed', 'expired'));
