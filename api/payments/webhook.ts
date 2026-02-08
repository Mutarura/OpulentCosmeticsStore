import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sendEmail } from '../_lib/email.js';
import { getPesapalToken, getTransactionStatus } from '../_lib/pesapal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Pesapal IPN can be GET or POST. We'll handle both or checking query params.
  // Typically Pesapal sends: ?OrderTrackingId=...&OrderMerchantReference=...&OrderNotificationType=...
  
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query as { [key: string]: string } || req.body;

  if (!OrderTrackingId || !OrderMerchantReference) {
    // This might be a test ping or invalid request
    return res.status(400).json({ error: 'Missing tracking ID or merchant reference' });
  }

  try {
    // 1. Authenticate with Pesapal
    const token = await getPesapalToken();

    // 2. Get Transaction Status
    const statusData = await getTransactionStatus(OrderTrackingId, token);
    
    // statusData structure example:
    // {
    //   payment_status_description: 'Completed',
    //   amount: 100,
    //   currency: 'KES',
    //   merchant_reference: '...',
    //   ...
    // }

    const { payment_status_description, amount, currency, merchant_reference } = statusData;

    // 3. Find Order in DB
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, total_amount, email, customer_name, delivery_address, delivery_area, phone')
      .eq('pesapal_merchant_reference', OrderMerchantReference)
      .single();

    if (orderError || !order) {
      console.error('Order not found for merchant ref:', OrderMerchantReference);
      // We return 200 to stop Pesapal from retrying if it's a permanent error (order missing)
      // Or 404 if we want them to retry. Let's return 404.
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check consistency
    if (merchant_reference !== OrderMerchantReference) {
        console.error('Mismatch in merchant reference');
        return res.status(400).json({ error: 'Reference mismatch' });
    }

    // 4. Handle Status
    // Pesapal statuses: COMPLETED, FAILED, INVALID, REVERSED
    // We only care about COMPLETED for fulfilling the order.
    
    if (payment_status_description === 'Completed') {
        
        // Idempotency check
        if (order.status === 'Paid' || order.status === 'Preparing' || order.status === 'Out for Delivery' || order.status === 'Delivered') {
            return res.status(200).json({ 
                status: 200, 
                message: 'Order already processed' 
            });
        }

        // Validate Amount
        if (Number(amount) < Number(order.total_amount)) {
            console.error('Insufficient payment amount');
            // Mark as failed or flag it?
             return res.status(200).json({ status: 500, message: 'Payment amount mismatch' });
        }

        // Update Order
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
                status: 'Paid',
                pesapal_order_tracking_id: OrderTrackingId,
            })
            .eq('id', order.id);

        if (updateError) {
            throw updateError;
        }

        // Reduce Inventory
        const { data: orderItems } = await supabaseAdmin
            .from('order_items')
            .select('product_id, quantity, size, color')
            .eq('order_id', order.id);

        if (orderItems) {
            for (const item of orderItems) {
                const { data: invRow } = await supabaseAdmin
                    .from('inventory')
                    .select('id, quantity')
                    .eq('product_id', item.product_id)
                    .eq('size', item.size || null)
                    .eq('color', item.color || null)
                    .maybeSingle();
                
                if (invRow) {
                    await supabaseAdmin
                        .from('inventory')
                        .update({ quantity: Math.max(0, invRow.quantity - item.quantity) })
                        .eq('id', invRow.id);
                }
            }
        }

        // Send Emails
        await sendEmail(
            order.email,
            'Order Confirmation - Opulent Cosmetics',
            `<h1>Thank you for your order!</h1>
             <p>Hi ${order.customer_name},</p>
             <p>We have received your payment for Order #${order.id.slice(0, 8)}.</p>
             <p>Total: ${currency} ${amount}</p>
             <p>Tracking ID: ${OrderTrackingId}</p>
             <p>We will notify you when it's dispatched.</p>`
        );

        await sendEmail(
            'admin@opulentcosmetics.com',
            'New Order Received (Pesapal)',
            `<h1>New Order #${order.id.slice(0, 8)}</h1>
             <p>Customer: ${order.customer_name} (${order.phone})</p>
             <p>Amount: ${currency} ${amount}</p>
             <p>Method: Pesapal</p>
             <p>Tracking ID: ${OrderTrackingId}</p>`
        );

    } else if (payment_status_description === 'Failed') {
         await supabaseAdmin
            .from('orders')
            .update({ status: 'Failed', pesapal_order_tracking_id: OrderTrackingId })
            .eq('id', order.id);
    }

    // Return the response Pesapal expects
    // Documentation says:
    // "Your IPN URL should return a JSON object with the property "orderNotificationType" and "orderTrackingId"."
    return res.status(200).json({
        orderNotificationType: OrderNotificationType,
        orderTrackingId: OrderTrackingId,
        status: 200
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
