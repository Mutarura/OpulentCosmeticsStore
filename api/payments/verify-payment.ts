import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'Missing payment reference' });
  }

  if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 1. Verify Transaction with Paystack
    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = verifyResponse.data.data;
    
    // Check if transaction was successful
    if (data.status !== 'success') {
      // Mark order as Failed if verification fails
      await supabaseAdmin
        .from('orders')
        .update({ status: 'Failed' })
        .eq('pesapal_merchant_reference', reference);

      return res.status(400).json({ error: 'Payment verification failed', status: data.status });
    }

    // 2. Find Order in DB
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, total_amount')
      .eq('pesapal_merchant_reference', reference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 3. Validate Amount
    // Paystack returns amount in kobo/cents (e.g., 10000 = 100.00)
    const paidAmount = data.amount / 100;
    
    // Allow small floating point difference
    if (Math.abs(paidAmount - Number(order.total_amount)) > 1) {
      console.error(`Amount mismatch: Expected ${order.total_amount}, Paid ${paidAmount}`);
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    // 4. Update Order Status
    // Idempotency check
    if (order.status === 'Paid' || order.status === 'Preparing' || order.status === 'Out for Delivery' || order.status === 'Delivered') {
      return res.status(200).json({ status: 'success', message: 'Order already processed' });
    }

    // Map Paystack Transaction ID to pesapal_order_tracking_id column
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'Paid',
        pesapal_order_tracking_id: String(data.id), // Store Paystack Transaction ID
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return res.status(500).json({ error: 'Failed to update order status' });
    }

    // 5. Update Inventory (Optional: Decrement stock here if not done at creation)
    // Note: If you want to decrement stock only upon payment, do it here.
    // For now, we assume stock is checked at creation but maybe not reserved.
    // Let's decrement stock here to be safe and accurate.
    
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity, size, color')
      .eq('order_id', order.id);

    if (orderItems) {
      for (const item of orderItems) {
        // Decrement logic - using rpc or direct update if simple
        // For simplicity, we fetch and update. In high concurrency, use RPC.
        const { data: inventory } = await supabaseAdmin
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .eq('size', item.size || null)
          .eq('color', item.color || null)
          .maybeSingle();
        
        if (inventory) {
          await supabaseAdmin
            .from('inventory')
            .update({ quantity: Math.max(0, inventory.quantity - item.quantity) })
            .eq('id', inventory.id);
        }
      }
    }

    return res.status(200).json({ status: 'success', orderId: order.id });

  } catch (error: any) {
    console.error('Payment Verification Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
