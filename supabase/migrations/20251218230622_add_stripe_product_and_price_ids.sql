/*
  # Add Stripe Product and Price IDs to Membership Pricing

  1. Schema Changes
    - Add `stripe_product_id` column to `membership_pricing` table
    - Add `stripe_price_id` column to `membership_pricing` table
  
  2. Data Updates
    - Set Stripe Product ID for all tiers: prod_PzXOKy3fuIeCPG
    - Set Stripe Price IDs:
      - Flex (PAYG): price_1Sawe9CcTUIOQ9MlGL7T3Nn2
      - Silver (Monthly): price_1P9YK1CcTUIOQ9MlXHmjTT5l
      - Gold (Yearly): price_1P9YK1CcTUIOQ9MlcWaVd99U
  
  3. Purpose
    - Enable proper Stripe subscription creation using Price IDs
    - Link membership tiers to Stripe products for webhook handling
*/

-- Add columns for Stripe Product and Price IDs
ALTER TABLE membership_pricing 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Add comments
COMMENT ON COLUMN membership_pricing.stripe_product_id IS 'Stripe Product ID (prod_xxx) - links to Stripe product';
COMMENT ON COLUMN membership_pricing.stripe_price_id IS 'Stripe Price ID (price_xxx) - used to create subscriptions';

-- Update Flex tier with PAYG price
UPDATE membership_pricing
SET 
  stripe_product_id = 'prod_PzXOKy3fuIeCPG',
  stripe_price_id = 'price_1Sawe9CcTUIOQ9MlGL7T3Nn2'
WHERE tier = 'flex';

-- Update Silver tier with monthly price
UPDATE membership_pricing
SET 
  stripe_product_id = 'prod_PzXOKy3fuIeCPG',
  stripe_price_id = 'price_1P9YK1CcTUIOQ9MlXHmjTT5l'
WHERE tier = 'silver';

-- Update Gold tier with yearly price
UPDATE membership_pricing
SET 
  stripe_product_id = 'prod_PzXOKy3fuIeCPG',
  stripe_price_id = 'price_1P9YK1CcTUIOQ9MlcWaVd99U'
WHERE tier = 'gold';