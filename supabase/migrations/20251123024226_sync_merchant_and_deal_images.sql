/*
  # Sync Merchant and Deal Images from files_storage

  This migration links existing images in files_storage to their respective merchants and deals.

  ## What it does:
  1. Updates merchants.cover_image_ids with IDs from files_storage where entity_type='merchant'
  2. Updates merchant_deals.image_ids with IDs from files_storage where entity_type='merchant_deal'
  3. Ensures the latest images are properly linked to their entities

  ## Changes:
  - Merchants: Populate cover_image_ids array with file IDs from files_storage
  - Deals: Populate image_ids array with file IDs from files_storage
  - Uses entity_id to match images to their parent records

  ## Important Notes:
  - Only updates records that have images in files_storage
  - Preserves existing data structure
  - Safe to run multiple times (idempotent)
*/

-- Step 1: Update merchants with their cover images from files_storage
UPDATE merchants m
SET cover_image_ids = (
  SELECT jsonb_agg(fs.id::text ORDER BY fs.id)
  FROM files_storage fs
  WHERE fs.entity_type = 'merchant'
    AND fs.entity_id = m.merchant_id
    AND fs.path LIKE 'MC_Cover_images/%'
)
WHERE EXISTS (
  SELECT 1 FROM files_storage fs
  WHERE fs.entity_type = 'merchant'
    AND fs.entity_id = m.merchant_id
);

-- Step 2: Update merchant_deals with their images from files_storage
UPDATE merchant_deals md
SET image_ids = (
  SELECT jsonb_agg(fs.id::text ORDER BY fs.id DESC)
  FROM files_storage fs
  WHERE fs.entity_type = 'merchant_deal'
    AND fs.entity_id = md.id::text
    AND fs.path LIKE 'MC_Deal_images/%'
),
image_id = (
  SELECT fs.id::text
  FROM files_storage fs
  WHERE fs.entity_type = 'merchant_deal'
    AND fs.entity_id = md.id::text
    AND fs.path LIKE 'MC_Deal_images/%'
  ORDER BY fs.id DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM files_storage fs
  WHERE fs.entity_type = 'merchant_deal'
    AND fs.entity_id = md.id::text
);

-- Verify the sync
DO $$
DECLARE
  merchant_count INTEGER;
  deal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO merchant_count
  FROM merchants
  WHERE cover_image_ids IS NOT NULL AND jsonb_array_length(cover_image_ids) > 0;
  
  SELECT COUNT(*) INTO deal_count
  FROM merchant_deals
  WHERE image_ids IS NOT NULL;
  
  RAISE NOTICE 'Synced images: % merchants, % deals', merchant_count, deal_count;
END $$;
