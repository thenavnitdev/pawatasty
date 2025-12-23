/*
  # Update Image Sync Triggers to Handle All Paths

  Updates the auto-sync triggers to handle images from any path,
  not just MC_Cover_images/ and MC_Deal_images/.

  ## Changes:
  - Remove path restrictions from merchant image sync
  - Remove path restrictions from deal image sync
  - Triggers now sync ALL images for merchants and deals

  ## Reason:
  - Backend API uses different paths (/uploads/, MC_Cover_images/, etc.)
  - Old images are in /uploads/, new ones in MC_Cover_images/
  - Need to support all paths for complete image coverage
*/

-- Update function to auto-sync merchant cover images (all paths)
CREATE OR REPLACE FUNCTION sync_merchant_cover_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Process all merchant images regardless of path
  IF NEW.entity_type = 'merchant' THEN
    -- Update the merchant's cover_image_ids
    UPDATE merchants
    SET cover_image_ids = (
      SELECT jsonb_agg(fs.id::text ORDER BY fs.id)
      FROM files_storage fs
      WHERE fs.entity_type = 'merchant'
        AND fs.entity_id = NEW.entity_id
    )
    WHERE merchant_id = NEW.entity_id;
    
    RAISE NOTICE 'Synced cover images for merchant %', NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function to auto-sync deal images (all paths)
CREATE OR REPLACE FUNCTION sync_deal_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Process all merchant_deal images regardless of path
  IF NEW.entity_type = 'merchant_deal' THEN
    -- Update the deal's image_ids and image_id
    UPDATE merchant_deals
    SET 
      image_ids = (
        SELECT jsonb_agg(fs.id::text ORDER BY fs.id DESC)
        FROM files_storage fs
        WHERE fs.entity_type = 'merchant_deal'
          AND fs.entity_id = NEW.entity_id
      ),
      image_id = (
        SELECT fs.id::text
        FROM files_storage fs
        WHERE fs.entity_type = 'merchant_deal'
          AND fs.entity_id = NEW.entity_id
        ORDER BY fs.id DESC
        LIMIT 1
      )
    WHERE id = NEW.entity_id::bigint;
    
    RAISE NOTICE 'Synced images for deal %', NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
