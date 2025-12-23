/*
  # Auto-sync Images to Merchants and Deals

  Creates triggers to automatically update merchant and deal image references
  whenever images are uploaded to files_storage.

  ## What it does:
  1. Creates function to sync merchant cover images
  2. Creates function to sync deal images
  3. Creates triggers on files_storage INSERT to auto-update parent records

  ## Benefits:
  - Automatic image linking when backend uploads files
  - No manual sync needed
  - Real-time updates to merchants and deals tables

  ## Important Notes:
  - Trigger fires AFTER INSERT on files_storage
  - Only processes merchant and merchant_deal entity types
  - Updates parent record immediately after image upload
*/

-- Function to auto-sync merchant cover images
CREATE OR REPLACE FUNCTION sync_merchant_cover_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process merchant images
  IF NEW.entity_type = 'merchant' AND NEW.path LIKE 'MC_Cover_images/%' THEN
    -- Update the merchant's cover_image_ids
    UPDATE merchants
    SET cover_image_ids = (
      SELECT jsonb_agg(fs.id::text ORDER BY fs.id)
      FROM files_storage fs
      WHERE fs.entity_type = 'merchant'
        AND fs.entity_id = NEW.entity_id
        AND fs.path LIKE 'MC_Cover_images/%'
    )
    WHERE merchant_id = NEW.entity_id;
    
    RAISE NOTICE 'Synced cover images for merchant %', NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-sync deal images
CREATE OR REPLACE FUNCTION sync_deal_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process merchant_deal images
  IF NEW.entity_type = 'merchant_deal' AND NEW.path LIKE 'MC_Deal_images/%' THEN
    -- Update the deal's image_ids and image_id
    UPDATE merchant_deals
    SET 
      image_ids = (
        SELECT jsonb_agg(fs.id::text ORDER BY fs.id DESC)
        FROM files_storage fs
        WHERE fs.entity_type = 'merchant_deal'
          AND fs.entity_id = NEW.entity_id
          AND fs.path LIKE 'MC_Deal_images/%'
      ),
      image_id = (
        SELECT fs.id::text
        FROM files_storage fs
        WHERE fs.entity_type = 'merchant_deal'
          AND fs.entity_id = NEW.entity_id
          AND fs.path LIKE 'MC_Deal_images/%'
        ORDER BY fs.id DESC
        LIMIT 1
      )
    WHERE id = NEW.entity_id::bigint;
    
    RAISE NOTICE 'Synced images for deal %', NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_sync_merchant_images ON files_storage;
DROP TRIGGER IF EXISTS auto_sync_deal_images ON files_storage;

-- Create trigger for merchant images
CREATE TRIGGER auto_sync_merchant_images
AFTER INSERT ON files_storage
FOR EACH ROW
WHEN (NEW.entity_type = 'merchant')
EXECUTE FUNCTION sync_merchant_cover_images();

-- Create trigger for deal images
CREATE TRIGGER auto_sync_deal_images
AFTER INSERT ON files_storage
FOR EACH ROW
WHEN (NEW.entity_type = 'merchant_deal')
EXECUTE FUNCTION sync_deal_images();

-- Add comment
COMMENT ON TRIGGER auto_sync_merchant_images ON files_storage IS 
'Automatically syncs merchant cover_image_ids when images are uploaded';

COMMENT ON TRIGGER auto_sync_deal_images ON files_storage IS 
'Automatically syncs merchant_deals image_ids when images are uploaded';
