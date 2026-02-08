-- Update delivery_zones
alter table public.delivery_zones
add column if not exists estimated_days text;

-- Update orders
alter table public.orders
add column if not exists delivery_area text,
add column if not exists delivery_address text,
add column if not exists currency text default 'KES',
add column if not exists flutterwave_tx_ref text,
add column if not exists flutterwave_transaction_id text;

-- Update status check constraint
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('Pending', 'Paid', 'Failed', 'Cancelled', 'Preparing', 'Out for Delivery', 'Delivered', 'Fulfilled'));

-- Update order_items
alter table public.order_items
add column if not exists product_name text;

-- Add index for flutterwave_tx_ref for fast webhook lookup
create index if not exists orders_flutterwave_tx_ref_idx on public.orders(flutterwave_tx_ref);
