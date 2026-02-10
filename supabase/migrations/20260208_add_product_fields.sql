-- Add description and is_bundle columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;
