/*
  # Update Business Type Categorization
  
  1. Changes
    - Updates the `business_type` column in the merchants table to accurately reflect merchant offerings
    - Sets business_type based on:
      - partnership_type (if explicitly set)
      - Presence of deals (merchant_deals table)
      - Presence of charging stations (station_items table)
    
  2. Categorization Logic
    - 'diningonly': Merchants with deals but no charging stations
    - 'chargingonly': Merchants with charging stations but no deals
    - 'diningandcharging': Merchants with both deals and charging stations
    
  3. Notes
    - Priority given to explicit partnership_type values
    - Fallback to inference from actual merchant data
    - Defaults to 'diningonly' for merchants with neither
*/

-- Update business_type based on partnership_type and actual merchant data
UPDATE merchants
SET business_type = CASE
  -- First check explicit partnership_type
  WHEN LOWER(TRIM(partnership_type)) = 'map_diningonly' THEN 'diningonly'
  WHEN LOWER(TRIM(partnership_type)) = 'map_chargingonly' THEN 'chargingonly'
  WHEN LOWER(TRIM(partnership_type)) = 'map_both' THEN 'diningandcharging'
  
  -- Then infer from actual data
  WHEN EXISTS (
    SELECT 1 FROM merchant_deals 
    WHERE merchant_deals.merchant_id = merchants.merchant_id
  ) AND EXISTS (
    SELECT 1 FROM station_items 
    WHERE station_items.merchant_id = merchants.merchant_id
  ) THEN 'diningandcharging'
  
  WHEN EXISTS (
    SELECT 1 FROM merchant_deals 
    WHERE merchant_deals.merchant_id = merchants.merchant_id
  ) THEN 'diningonly'
  
  WHEN EXISTS (
    SELECT 1 FROM station_items 
    WHERE station_items.merchant_id = merchants.merchant_id
  ) THEN 'chargingonly'
  
  -- Default to diningonly
  ELSE 'diningonly'
END;

-- Create an index for faster filtering by business_type
CREATE INDEX IF NOT EXISTS idx_merchants_business_type ON merchants(business_type);

-- Create a function to automatically update business_type when deals or stations change
CREATE OR REPLACE FUNCTION update_merchant_business_type()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE merchants
  SET business_type = CASE
    WHEN LOWER(TRIM(partnership_type)) = 'map_diningonly' THEN 'diningonly'
    WHEN LOWER(TRIM(partnership_type)) = 'map_chargingonly' THEN 'chargingonly'
    WHEN LOWER(TRIM(partnership_type)) = 'map_both' THEN 'diningandcharging'
    WHEN EXISTS (
      SELECT 1 FROM merchant_deals 
      WHERE merchant_deals.merchant_id = merchants.merchant_id
    ) AND EXISTS (
      SELECT 1 FROM station_items 
      WHERE station_items.merchant_id = merchants.merchant_id
    ) THEN 'diningandcharging'
    WHEN EXISTS (
      SELECT 1 FROM merchant_deals 
      WHERE merchant_deals.merchant_id = merchants.merchant_id
    ) THEN 'diningonly'
    WHEN EXISTS (
      SELECT 1 FROM station_items 
      WHERE station_items.merchant_id = merchants.merchant_id
    ) THEN 'chargingonly'
    ELSE 'diningonly'
  END
  WHERE merchant_id = COALESCE(NEW.merchant_id, OLD.merchant_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update business_type
DROP TRIGGER IF EXISTS trigger_update_business_type_on_deal_change ON merchant_deals;
CREATE TRIGGER trigger_update_business_type_on_deal_change
  AFTER INSERT OR DELETE ON merchant_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_business_type();

DROP TRIGGER IF EXISTS trigger_update_business_type_on_station_change ON station_items;
CREATE TRIGGER trigger_update_business_type_on_station_change
  AFTER INSERT OR DELETE ON station_items
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_business_type();

-- Create trigger for partnership_type changes
DROP TRIGGER IF EXISTS trigger_update_business_type_on_partnership_change ON merchants;
CREATE TRIGGER trigger_update_business_type_on_partnership_change
  AFTER UPDATE OF partnership_type ON merchants
  FOR EACH ROW
  WHEN (OLD.partnership_type IS DISTINCT FROM NEW.partnership_type)
  EXECUTE FUNCTION update_merchant_business_type();
