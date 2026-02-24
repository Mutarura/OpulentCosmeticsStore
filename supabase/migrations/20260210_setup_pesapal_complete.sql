-- Migration: 20260210_setup_pesapal_complete.sql
-- Purpose: Consolidate all schema changes required for Pesapal integration and delivery updates.
-- Run this in your Supabase SQL Editor.

-- 1. Update delivery_zones
ALTER TABLE public.delivery_zones
ADD COLUMN IF NOT EXISTS estimated_days TEXT;

-- 2. Update orders table with Delivery and Payment fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_area TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS pesapal_order_tracking_id TEXT,
ADD COLUMN IF NOT EXISTS pesapal_merchant_reference TEXT,
-- Remove deprecated fields if they exist (optional cleanup)
DROP COLUMN IF EXISTS flutterwave_tx_ref,
DROP COLUMN IF EXISTS flutterwave_transaction_id;

-- 3. Update Order Status Constraints
-- Drop existing check constraint to allow new statuses if any
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- Re-add constraint with all valid statuses
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Pending', 'Paid', 'Failed', 'Cancelled', 'Preparing', 'Out for Delivery', 'Delivered', 'Fulfilled'));

-- 4. Update order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- 5. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS orders_pesapal_merchant_ref_idx ON public.orders(pesapal_merchant_reference);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- 6. Ensure products table has subcategory (needed for Admin Dashboard)
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 7. Fix currency for existing orders
UPDATE orders SET currency = 'KES' WHERE currency IS NULL;

-- 8. Seed default delivery zones if table is empty
INSERT INTO public.delivery_zones (name, fee, active, estimated_days)
SELECT 'Nairobi CBD', 200, true, '1-2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_zones);

INSERT INTO public.delivery_zones (name, fee, active, estimated_days)
SELECT 'Nairobi Outskirts', 350, true, '1-2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_zones WHERE name = 'Nairobi Outskirts');

INSERT INTO public.delivery_zones (name, fee, active, estimated_days)
SELECT 'Upcountry', 500, true, '2-4 days'
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_zones WHERE name = 'Upcountry');

-- 9. Seed demo products (idempotent per product, keeps existing rows)
INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Velvet Rose Lipstick', 'hers', 'Makeup', 3500, NULL::numeric(10,2), ARRAY['3.5g'], true, 'A rich, creamy lipstick with a satin finish that lasts all day.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Velvet Rose Lipstick');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Radiance Serum', 'hers', 'Skincare', 5200, NULL::numeric(10,2), ARRAY['30ml'], true, 'Brightening serum infused with Vitamin C for a glowing complexion.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Radiance Serum');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Floral Essence Perfume', 'hers', 'Fragrance', 9500, NULL::numeric(10,2), ARRAY['50ml'], true, 'A delicate blend of jasmine, rose, and vanilla.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Floral Essence Perfume');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Hydrating Night Cream', 'hers', 'Skincare', 4500, NULL::numeric(10,2), ARRAY['50ml'], true, 'Deeply moisturizing night cream to repair skin while you sleep.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Hydrating Night Cream');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Refined Beard Oil', 'his', 'Grooming', 4200, NULL::numeric(10,2), ARRAY['30ml'], true, 'Nourishing beard oil with a masculine cedarwood scent.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Refined Beard Oil');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Daily Moisturizer for Men', 'his', 'Skincare', 3600, NULL::numeric(10,2), ARRAY['50ml'], true, 'Lightweight, non-greasy moisturizer with SPF 15.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Daily Moisturizer for Men');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Ocean Breeze Cologne', 'his', 'Fragrance', 8500, NULL::numeric(10,2), ARRAY['50ml'], true, 'Fresh and invigorating cologne with notes of sea salt and citrus.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Ocean Breeze Cologne');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Shaving Cream Kit', 'his', 'Grooming', 5200, NULL::numeric(10,2), ARRAY['Kit'], true, 'Luxury shaving kit including brush, cream, and razor.', true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Shaving Cream Kit');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Weekend Glow Skincare Set', 'hers', 'Skincare', 9800, 8200, ARRAY['Set'], true, 'Curated weekend routine with cleanser, serum, and night cream.', true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Weekend Glow Skincare Set');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Rose & Oud Discovery Set', 'hers', 'Perfumes', 12500, 10500, ARRAY['Set'], true, 'Miniature fragrances layering rose, oud, and vanilla.', true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Rose & Oud Discovery Set');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Citrus Body Polish', 'hers', 'Body Essentials', 3800, NULL::numeric(10,2), ARRAY['250g'], true, 'Brightening sugar scrub with citrus oils for smooth, glowing skin.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Citrus Body Polish');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Midnight Peony Hair Mist', 'hers', 'Body Essentials', 4200, 3650, ARRAY['100ml'], true, 'Lightweight hair mist with peony and musk notes for evening wear.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Midnight Peony Hair Mist');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Soft Matte Lip Trio', 'hers', 'Makeup', 5600, 4800, ARRAY['Set'], true, 'Trio of soft matte liquid lipsticks in everyday nude tones.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Soft Matte Lip Trio');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Daily Grooming Essentials Kit', 'his', 'Grooming', 9900, 8400, ARRAY['Kit'], true, 'All-in-one kit with face wash, moisturizer, and beard oil.', true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Daily Grooming Essentials Kit');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'City Nights Fragrance Set', 'his', 'Fragrance', 13200, 11200, ARRAY['Set'], true, 'Two-piece evening fragrance set with warm amber and woods.', true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'City Nights Fragrance Set');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Cooling Post-Shave Gel', 'his', 'Grooming', 3200, NULL::numeric(10,2), ARRAY['100ml'], true, 'Alcohol-free gel that cools and soothes skin after shaving.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Cooling Post-Shave Gel');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Charcoal Body Bar Trio', 'his', 'Body Essentials', 3900, 3400, ARRAY['Set'], true, 'Set of three detoxifying charcoal body bars for daily use.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Charcoal Body Bar Trio');

INSERT INTO public.products (name, category, subcategory, price, discount_price, sizes, active, description, is_bundle)
SELECT 'Sport Refresh Body Mist', 'his', 'Body Essentials', 4500, NULL::numeric(10,2), ARRAY['150ml'], true, 'Invigorating all-over body mist for post-workout freshness.', false
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Sport Refresh Body Mist');
