-- Run this script in your Supabase Dashboard SQL Editor to add the missing columns

-- 1. Add missing columns to 'orders' table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_area text,
ADD COLUMN IF NOT EXISTS pesapal_merchant_reference text,
ADD COLUMN IF NOT EXISTS pesapal_order_tracking_id text;

-- 2. Add missing columns to 'order_items' table
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS color text;

-- Optional: Verify the columns were added
SELECT column_name, table_name 
FROM information_schema.columns 
WHERE table_name IN ('orders', 'order_items')
ORDER BY table_name, column_name;
