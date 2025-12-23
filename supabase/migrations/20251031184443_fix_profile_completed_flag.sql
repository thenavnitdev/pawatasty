/*
  # Fix profile_completed flag for existing users
  
  1. Purpose
    - Update profile_completed flag to true for users who have complete information
    - A complete profile requires: first_name AND last_name AND (email OR phone_nr)
  
  2. Changes
    - Mark profiles as completed when they have required fields
    - This fixes users who have complete data but weren't marked as completed
  
  3. Safety
    - Only updates records that meet the completion criteria
    - Uses safe UPDATE with WHERE conditions
*/

-- Update profile_completed flag for users with complete information
UPDATE users
SET profile_completed = true
WHERE (profile_completed IS NULL OR profile_completed = false)
  AND first_name IS NOT NULL 
  AND first_name != ''
  AND last_name IS NOT NULL 
  AND last_name != ''
  AND (
    (email IS NOT NULL AND email != '') 
    OR 
    (phone_nr IS NOT NULL AND phone_nr != '')
  );
