/*
  # Fix Subcategory Names Format

  1. Changes
    - Update SC001: "Dine  Bites & Drinks" → "Dine / Bites & Drinks"
    - Update SC003: "Bites  Drinks & Charging" → "Bites / Drinks & Charging"
    
  2. Purpose
    - Ensure proper formatting with slashes instead of double spaces
    - Match the correct business naming convention
*/

UPDATE merchant_subcategories
SET subcategory_name = 'Dine / Bites & Drinks'
WHERE subcategory_id = 'SC001';

UPDATE merchant_subcategories
SET subcategory_name = 'Bites / Drinks & Charging'
WHERE subcategory_id = 'SC003';
