-- Migration: 20250210_stabilization.sql
-- Purpose: Ensure schema alignment, add performance indexes, and standardize currency.

-- 1. Ensure PRODUCTS table has all required columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- 'stock' is likely handled in 'inventory' table, but checking if 'stock' column exists on products for simple management if used
-- If 'stock' is intended to be on products table directly:
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- 2. Ensure ORDERS table has currency column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(active);

CREATE INDEX IF NOT EXISTS idx_banners_section ON banners(section);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);

-- 4. Currency Standardization (Data Cleanup)
-- Optional: Update existing orders to use KES if null (be careful with this in prod, but safe for dev/fix)
UPDATE orders SET currency = 'KES' WHERE currency IS NULL;

-- 5. Ensure BANNERS table structure (based on usage)
-- id, section, image_path, headline, subtext, cta_text, cta_link, active, sort_order
ALTER TABLE banners ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS subtext TEXT;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_link TEXT;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
