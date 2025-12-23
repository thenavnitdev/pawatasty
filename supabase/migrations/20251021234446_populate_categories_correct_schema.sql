/*
  # Populate Categories Table (Correct Schema)
  
  1. Add Common Categories
    - Restaurant categories for food service businesses
    - Based on actual table schema (name, slug, description, icon_url, sort_order, active)
  
  2. Categories Added
    - 10 common dining categories
    - Each with proper slug, description, and sort order
  
  3. Important
    - Only inserts if table is empty
    - Uses actual column names from schema
*/

-- Insert categories only if table is empty
INSERT INTO categories (name, slug, description, icon_url, sort_order, active, created_at)
SELECT * FROM (
  VALUES
    ('Restaurant', 'restaurant', 'Full service dining establishments', null, 1, true, NOW()),
    ('Fast Food', 'fast-food', 'Quick service restaurants', null, 2, true, NOW()),
    ('Cafe', 'cafe', 'Coffee shops and casual eateries', null, 3, true, NOW()),
    ('Bar', 'bar', 'Bars and pubs serving drinks', null, 4, true, NOW()),
    ('Bakery', 'bakery', 'Fresh baked goods and pastries', null, 5, true, NOW()),
    ('Dessert', 'dessert', 'Sweet treats and ice cream', null, 6, true, NOW()),
    ('Asian', 'asian', 'Asian cuisine restaurants', null, 7, true, NOW()),
    ('Italian', 'italian', 'Italian restaurants and pizzerias', null, 8, true, NOW()),
    ('Mediterranean', 'mediterranean', 'Mediterranean and Middle Eastern cuisine', null, 9, true, NOW()),
    ('Healthy', 'healthy', 'Health-focused and organic dining', null, 10, true, NOW())
) AS new_categories(name, slug, description, icon_url, sort_order, active, created_at)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);
