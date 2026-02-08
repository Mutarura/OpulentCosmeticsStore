-- Remove Flutterwave columns
alter table public.orders
drop column if exists flutterwave_tx_ref,
drop column if exists flutterwave_transaction_id;

-- Add Pesapal columns
alter table public.orders
add column if not exists pesapal_order_tracking_id text,
add column if not exists pesapal_merchant_reference text;

-- Add index for pesapal_merchant_reference for fast lookup
create index if not exists orders_pesapal_merchant_ref_idx on public.orders(pesapal_merchant_reference);
