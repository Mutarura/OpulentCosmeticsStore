-- Allow accessories as a product category 
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_category_check; 
ALTER TABLE products 
  ADD CONSTRAINT products_category_check 
  CHECK (category IN ('his', 'hers', 'accessories')); 

-- Add subcategory column if it doesn't exist 
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS subcategory TEXT; 

-- Allow accessories as a banner section 
ALTER TABLE banners 
  DROP CONSTRAINT IF EXISTS banners_section_check; 
ALTER TABLE banners 
  ADD CONSTRAINT banners_section_check 
  CHECK (section IN ('his', 'hers', 'accessories')); 

-- Seed accessories banner if none exists 
INSERT INTO banners (section, image_path, headline, subtext, cta_text, cta_link, active, sort_order) 
SELECT 
  'accessories', 
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1920&auto=format&fit=crop', 
  'Curated Accessories', 
  'Chains, earrings, makeup bags and more — reserved for the discerning few.', 
  'Shop Now', 
  '/products/accessories', 
  true, 
  1 
WHERE NOT EXISTS ( 
  SELECT 1 FROM banners WHERE section = 'accessories' 
);

-- Seed additional accessories banners
INSERT INTO banners (section, image_path, headline, subtext, cta_text, cta_link, active, sort_order) 
VALUES 
  ('accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1920&auto=format&fit=crop', 'Fine Jewellery', 'Chains and earrings for every occasion', 'Shop Jewellery', '/products/accessories', true, 2), 
  ('accessories', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1920&auto=format&fit=crop', 'Carry in Style', 'Premium makeup bags and pouches', 'Shop Bags', '/products/accessories', true, 3) 
ON CONFLICT DO NOTHING; 
