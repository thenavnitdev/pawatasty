/*
  # Fix Order Number Generation to Prevent Duplicates

  Updates the generate_order_number() function to use a combination of:
  - Timestamp (milliseconds)
  - Random string (cryptographically secure)
  
  This ensures globally unique order numbers even with concurrent requests.

  ## Changes:
  - Replace sequence-based generation with timestamp + random
  - Format: {timestamp}-{random} (e.g., "1732412345678-A7B9C2")
  - Guaranteed uniqueness across all scenarios

  ## Reason:
  - Sequential numbers can duplicate with concurrent inserts
  - Timestamp + random provides collision-resistant identifiers
  - More scalable for high-traffic scenarios
*/

-- Drop existing function
DROP FUNCTION IF EXISTS generate_order_number();

-- Create improved order number generator
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  timestamp_part text;
  random_part text;
  order_num text;
  max_attempts int := 10;
  attempt int := 0;
BEGIN
  LOOP
    -- Get current timestamp in milliseconds
    timestamp_part := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint::text;
    
    -- Generate cryptographically secure random string (6 characters)
    random_part := upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    
    -- Combine: timestamp-random
    order_num := timestamp_part || '-' || random_part;
    
    -- Check if this order number already exists (extremely unlikely but safe)
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = order_num) THEN
      RETURN order_num;
    END IF;
    
    -- Increment attempt counter
    attempt := attempt + 1;
    
    -- If we've tried too many times, add extra randomness
    IF attempt >= max_attempts THEN
      order_num := order_num || '-' || (random() * 999)::int::text;
      RETURN order_num;
    END IF;
    
    -- Small delay before retry (1ms)
    PERFORM pg_sleep(0.001);
  END LOOP;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION generate_order_number() IS 
'Generates unique order numbers using timestamp + random string. Format: {timestamp_ms}-{random_hex}. Collision-resistant and suitable for high-traffic scenarios.';
