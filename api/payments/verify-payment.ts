import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getPesapalTransactionStatus, requirePesapalEnv } from '../_lib/pesapal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'Missing payment reference' });
  }

  try {
    requirePesapalEnv();

    // 1. Find Order in DB
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, total_amount, pesapal_order_tracking_id')
      .eq('pesapal_merchant_reference', reference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.pesapal_order_tracking_id) {
      return res
        .status(400)
        .json({ error: 'Missing order tracking id for verification' });
    }

    // 2. Verify Transaction with Pesapal
    const statusResp = await getPesapalTransactionStatus(
      order.pesapal_order_tracking_id
    );

    const paymentStatus: string =
      statusResp?.status || statusResp?.payment_status || '';
    const paidAmount = Number(statusResp?.amount ?? 0);

    // 3. Validate Amount (tolerate small rounding)
    if (
      paidAmount > 0 &&
      Math.abs(paidAmount - Number(order.total_amount)) > 1
    ) {
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    // 4. Update Order Status
    // Idempotency check
    if (order.status === 'Paid' || order.status === 'Preparing' || order.status === 'Out for Delivery' || order.status === 'Delivered') {
      return res.status(200).json({ status: 'success', message: 'Order already processed' });
    }

    let nextStatus: 'Paid' | 'Failed' | 'Pending' = 'Pending';
    if (String(paymentStatus).toUpperCase() === 'COMPLETED') {
      nextStatus = 'Paid';
    } else if (String(paymentStatus).toUpperCase() === 'FAILED') {
      nextStatus = 'Failed';
    } else {
      nextStatus = 'Pending';
    }

    if (nextStatus !== 'Pending') {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: nextStatus,
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order status:', updateError);
        return res.status(500).json({ error: 'Failed to update order status' });
      }
    } else {
      return res.status(200).json({ status: 'pending' });
    }

    // 5. Update Inventory (decrement on first success)
    // Note: If you want to decrement stock only upon payment, do it here.
    // Decrement stock when transitioning to Paid
    
    if (nextStatus === 'Paid') {
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity, size, color')
        .eq('order_id', order.id);

      if (orderItems) {
        for (const item of orderItems) {
          let invQ = supabaseAdmin
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product_id);
          invQ = item.size ? invQ.eq('size', item.size) : invQ.is('size', null);
          invQ = item.color ? invQ.eq('color', item.color) : invQ.is('color', null);
          const { data: inventory } = await invQ.maybeSingle();
          if (inventory) {
            await supabaseAdmin
              .from('inventory')
              .update({ quantity: Math.max(0, inventory.quantity - item.quantity) })
              .eq('id', inventory.id);
          }
        }
      }
    }

    return res.status(200).json({ status: 'success', orderId: order.id });

  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('Payment Verification Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
