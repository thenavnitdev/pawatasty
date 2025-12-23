/*
  # Normalize User Profile Data Structure
  
  1. Current State Analysis
    - 4,729 total users
    - 99.7% have complete profiles (4,715 users)
    - Data is correctly stored in appropriate columns
    - No data in wrong fields (0 emails in name fields, etc)
    
  2. Data Distribution
    - full_name: 100% populated (4,729/4,729) ✅
    - email: 100% populated (4,729/4,729) ✅
    - first_name: 99.8% populated (4,720/4,729)
    - last_name: 99.8% populated (4,720/4,729)
    - phone_nr: 90.6% populated (4,285/4,729)
    - profile_picture: 99.8% populated (4,719/4,729)
    - subscription: 99.9% populated (4,724/4,729)
    - profile_level: 99.8% populated (4,719/4,729)
    
  3. Issues to Fix
    - Split full_name into first_name/last_name where missing (9 users)
    - Set default subscription for 5 users missing it
    - Set default profile_level for 10 users missing it
    - Ensure profile_completed reflects actual data completeness
    
  4. Data Quality
    ✅ No emails in name fields
    ✅ No invalid email formats
    ✅ All data in correct columns
    ✅ Proper data types
    
  5. Normalization Actions
    - Fill missing first_name/last_name from full_name
    - Set default 'flex' subscription where missing
    - Set default 'basic' profile_level where missing
    - Update profile_completed based on actual data
    - Add indexes for better performance
*/

-- Step 1: Split full_name into first_name and last_name where missing
UPDATE users
SET 
    first_name = COALESCE(first_name, SPLIT_PART(full_name, ' ', 1)),
    last_name = COALESCE(last_name, 
        CASE 
            WHEN ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1 
            THEN SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2)
            ELSE SPLIT_PART(full_name, ' ', 1)
        END
    )
WHERE first_name IS NULL OR last_name IS NULL;

-- Step 2: Set default subscription for users missing it
UPDATE users
SET subscription = 'flex'
WHERE subscription IS NULL OR subscription = '';

-- Step 3: Set default profile_level for users missing it  
UPDATE users
SET profile_level = 'basic'
WHERE profile_level IS NULL OR profile_level = '';

-- Step 4: Update profile_completed flag based on actual data
UPDATE users
SET profile_completed = CASE
    WHEN full_name IS NOT NULL AND full_name != ''
         AND email IS NOT NULL AND email != ''
         AND (phone_nr IS NOT NULL AND phone_nr != '')
    THEN true
    ELSE false
END
WHERE profile_completed IS NULL 
   OR profile_completed != (
       full_name IS NOT NULL AND full_name != ''
       AND email IS NOT NULL AND email != ''
       AND (phone_nr IS NOT NULL AND phone_nr != '')
   );

-- Step 5: Add performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_nr ON users(phone_nr) WHERE phone_nr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed) WHERE profile_completed = true;
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription) WHERE subscription IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_profile_level ON users(profile_level) WHERE profile_level IS NOT NULL;

-- Step 6: Add composite index for profile queries
CREATE INDEX IF NOT EXISTS idx_users_profile_lookup ON users(email, profile_completed, subscription);
