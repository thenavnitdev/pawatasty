/*
  # Add Ticket Tracking Numbers for Issue Reports

  1. Changes to fault_reports table
    - Add `ticket_number` column (unique identifier for tracking)
    - Format: FR-YYYYMMDD-XXXX (e.g., FR-20251120-0001)
    - Add trigger to auto-generate ticket numbers
    - Add index for fast lookups

  2. Changes to suggestions table
    - Add `ticket_number` column (unique identifier for tracking)
    - Format: SG-YYYYMMDD-XXXX (e.g., SG-20251120-0001)
    - Add trigger to auto-generate ticket numbers
    - Add index for fast lookups

  3. User Contact Info
    - Add columns to store user contact info at time of report
    - Helps admin contact users even if they change details later

  4. Notes
    - Ticket numbers are immutable once created
    - Unique within each table
    - Sequential per day for easy tracking
*/

-- Add ticket_number column to fault_reports
ALTER TABLE fault_reports 
ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_phone TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Add ticket_number column to suggestions
ALTER TABLE suggestions 
ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_phone TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create function to generate fault report ticket numbers
CREATE OR REPLACE FUNCTION generate_fault_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix TEXT;
  count_today INTEGER;
  new_ticket TEXT;
BEGIN
  -- Generate date prefix (FR-YYYYMMDD)
  date_prefix := 'FR-' || TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Count tickets created today
  SELECT COUNT(*) INTO count_today
  FROM fault_reports
  WHERE ticket_number LIKE date_prefix || '-%';
  
  -- Generate new ticket number with padding
  new_ticket := date_prefix || '-' || LPAD((count_today + 1)::TEXT, 4, '0');
  
  -- Assign to new row
  NEW.ticket_number := new_ticket;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate suggestion ticket numbers
CREATE OR REPLACE FUNCTION generate_suggestion_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix TEXT;
  count_today INTEGER;
  new_ticket TEXT;
BEGIN
  -- Generate date prefix (SG-YYYYMMDD)
  date_prefix := 'SG-' || TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Count tickets created today
  SELECT COUNT(*) INTO count_today
  FROM suggestions
  WHERE ticket_number LIKE date_prefix || '-%';
  
  -- Generate new ticket number with padding
  new_ticket := date_prefix || '-' || LPAD((count_today + 1)::TEXT, 4, '0');
  
  -- Assign to new row
  NEW.ticket_number := new_ticket;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fault_reports
DROP TRIGGER IF EXISTS set_fault_ticket_number ON fault_reports;
CREATE TRIGGER set_fault_ticket_number
  BEFORE INSERT ON fault_reports
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_fault_ticket_number();

-- Create trigger for suggestions
DROP TRIGGER IF EXISTS set_suggestion_ticket_number ON suggestions;
CREATE TRIGGER set_suggestion_ticket_number
  BEFORE INSERT ON suggestions
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_suggestion_ticket_number();

-- Create indexes for fast ticket number lookups
CREATE INDEX IF NOT EXISTS idx_fault_reports_ticket_number ON fault_reports(ticket_number);
CREATE INDEX IF NOT EXISTS idx_suggestions_ticket_number ON suggestions(ticket_number);

-- Create indexes for user_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_fault_reports_user_id ON fault_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);

-- Backfill ticket numbers for existing records (if any)
DO $$
DECLARE
  rec RECORD;
  date_prefix TEXT;
  seq_num INTEGER;
BEGIN
  -- Backfill fault_reports
  seq_num := 1;
  FOR rec IN 
    SELECT id, created_at 
    FROM fault_reports 
    WHERE ticket_number IS NULL 
    ORDER BY created_at
  LOOP
    date_prefix := 'FR-' || TO_CHAR(rec.created_at, 'YYYYMMDD');
    UPDATE fault_reports 
    SET ticket_number = date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0')
    WHERE id = rec.id;
    seq_num := seq_num + 1;
  END LOOP;

  -- Backfill suggestions
  seq_num := 1;
  FOR rec IN 
    SELECT id, created_at 
    FROM suggestions 
    WHERE ticket_number IS NULL 
    ORDER BY created_at
  LOOP
    date_prefix := 'SG-' || TO_CHAR(rec.created_at, 'YYYYMMDD');
    UPDATE suggestions 
    SET ticket_number = date_prefix || '-' || LPAD(seq_num::TEXT, 4, '0')
    WHERE id = rec.id;
    seq_num := seq_num + 1;
  END LOOP;
END $$;
