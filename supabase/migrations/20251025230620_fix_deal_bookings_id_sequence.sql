/*
  # Fix deal_bookings ID column to auto-increment

  1. Changes
    - Add a sequence for the id column
    - Set the id column default to use the sequence
    - Set the sequence to start from the current max id + 1
  
  2. Notes
    - This ensures all new bookings get an automatic ID
    - Existing rows are not affected
*/

-- Create a sequence for deal_bookings id
CREATE SEQUENCE IF NOT EXISTS deal_bookings_id_seq;

-- Set the sequence to start from current max + 1
SELECT setval('deal_bookings_id_seq', COALESCE((SELECT MAX(id) FROM deal_bookings), 0) + 1, false);

-- Set the id column default to use the sequence
ALTER TABLE deal_bookings 
  ALTER COLUMN id SET DEFAULT nextval('deal_bookings_id_seq');

-- Set the sequence ownership to the column
ALTER SEQUENCE deal_bookings_id_seq OWNED BY deal_bookings.id;