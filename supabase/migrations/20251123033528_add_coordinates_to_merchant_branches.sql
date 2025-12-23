/*
  # Add Geographic Coordinates to Merchant Branches

  Adds latitude and longitude columns to merchant_branches table so branches
  can appear as separate locations on the map and discovery page.

  ## Changes:
  1. Add latitude column (decimal, nullable)
  2. Add longitude column (decimal, nullable)
  3. Create index for geographic queries
  4. Populate coordinates for branches from their addresses

  ## Important Notes:
  - Branches without coordinates will inherit merchant coordinates
  - Each branch can now have its own location on the map
  - Enables independent branch discovery
*/

-- Add latitude and longitude columns
ALTER TABLE merchant_branches 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- Create index for geographic lookups
CREATE INDEX IF NOT EXISTS idx_merchant_branches_coords 
ON merchant_branches(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment
COMMENT ON COLUMN merchant_branches.latitude IS 
'Geographic latitude of the branch location. If NULL, inherits from parent merchant.';

COMMENT ON COLUMN merchant_branches.longitude IS 
'Geographic longitude of the branch location. If NULL, inherits from parent merchant.';
