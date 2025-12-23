/*
  # Fix Profile Completion Data
  
  1. Update Existing Users
    - Mark users with phone_nr and full_name as profile_completed
    - Fixes issue where 90% of users have data but only 9% marked complete
  
  2. Data Integrity
    - Only update users with valid phone numbers and names
    - Set profile_completed = true for all qualifying users
    - Skip updated_at since it's JSONB type (legacy schema issue)
  
  3. Expected Impact
    - ~4,000 users will be updated from profile_completed=false to true
    - Users will no longer be asked to complete already-completed profiles
*/

-- Update users who have phone numbers and names but aren't marked as completed
UPDATE users
SET profile_completed = true
WHERE phone_nr IS NOT NULL
  AND phone_nr != ''
  AND (full_name IS NOT NULL AND full_name != '' 
       OR (first_name IS NOT NULL AND first_name != ''))
  AND (profile_completed = false OR profile_completed IS NULL);
