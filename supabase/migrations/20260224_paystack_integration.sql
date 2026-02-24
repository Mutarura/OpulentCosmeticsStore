-- Migration: 20260224_paystack_integration.sql
-- Purpose: Transition from Pesapal to Paystack using existing columns.

-- We are reusing existing columns to avoid data loss/schema changes in production without direct access.
-- pesapal_merchant_reference -> Stores Paystack Reference (e.g., ORD-...)
-- pesapal_order_tracking_id -> Stores Paystack Transaction ID

-- If possible, rename columns in a future maintenance window:
-- ALTER TABLE orders RENAME COLUMN pesapal_merchant_reference TO payment_reference;
-- ALTER TABLE orders RENAME COLUMN pesapal_order_tracking_id TO payment_provider_id;
