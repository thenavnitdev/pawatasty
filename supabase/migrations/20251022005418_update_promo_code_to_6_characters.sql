/*
  # Update Promo Codes to 6 Characters

  1. Changes
    - Update generate_unique_promo_code function to generate 6-character codes instead of 8
    - Regenerate all existing promo codes to be 6 characters
    - Maintain uniqueness across all codes

  2. Security
    - Function remains SECURITY DEFINER for system operations
    - No RLS policy changes needed
*/

-- Update the function to generate 6-character codes
CREATE OR REPLACE FUNCTION generate_unique_promo_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
  attempts integer := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique promo code';
    END IF;
    
    -- Generate 6-character code instead of 8
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check uniqueness in both tables and users.promo_code
    SELECT EXISTS (
      SELECT 1 FROM user_promo_codes WHERE promo_code = new_code
      UNION ALL
      SELECT 1 FROM promo_codes WHERE code = new_code
      UNION ALL
      SELECT 1 FROM users WHERE promo_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regenerate all promo codes in users table to be 6 characters
DO $$
DECLARE
    user_record RECORD;
    new_promo_code TEXT;
BEGIN
    FOR user_record IN 
        SELECT user_id 
        FROM users 
        WHERE user_id IS NOT NULL
    LOOP
        new_promo_code := generate_unique_promo_code();
        
        UPDATE users 
        SET promo_code = new_promo_code
        WHERE user_id = user_record.user_id;
    END LOOP;
END $$;

-- Regenerate all promo codes in user_promo_codes table
DO $$
DECLARE
    promo_record RECORD;
    new_promo_code TEXT;
BEGIN
    FOR promo_record IN 
        SELECT user_id 
        FROM user_promo_codes
    LOOP
        new_promo_code := generate_unique_promo_code();
        
        UPDATE user_promo_codes 
        SET promo_code = new_promo_code,
            updated_at = now()
        WHERE user_id = promo_record.user_id;
    END LOOP;
END $$;
