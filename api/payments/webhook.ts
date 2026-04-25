import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getPesapalTransactionStatus, requirePesapalEnv } from '../_lib/pesapal.js';
import { sendEmail } from '../_lib/email.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Pesapal sends IPN as a GET request with query params
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

  if (!OrderTrackingId || !OrderMerchantReference) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  console.log(`IPN Received: TrackingId=${OrderTrackingId}, Reference=${OrderMerchantReference}, Type=${OrderNotificationType}`);

  try {
    requirePesapalEnv();

    // 1. Find Order in DB
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('pesapal_merchant_reference', OrderMerchantReference)
      .single();

    if (orderError || !order) {
      console.error('IPN Error: Order not found', OrderMerchantReference);
      return res.status(404).json({ error: 'Order not found' });
    }

    // 2. Verify Transaction with Pesapal
    const statusResp = await getPesapalTransactionStatus(String(OrderTrackingId));
    
    // Log the full response so we can see exactly what Pesapal returns 
    console.log('Pesapal raw status response:', JSON.stringify(statusResp)); 

    const paymentStatus: string = 
      statusResp?.payment_status_description || 
      statusResp?.status_description || 
      statusResp?.status || 
      statusResp?.payment_status || 
      ''; 
    const paidAmount = Number(statusResp?.amount ?? 0); 

    console.log(`Pesapal Status for ${OrderMerchantReference}: "${paymentStatus}", Amount: ${paidAmount}`); 

    // 3. Update Order Status if not already processed
    if (order.status === 'Paid' || order.status === 'Preparing' || order.status === 'Out for Delivery' || order.status === 'Delivered') {
      // Already processed, return 200 to Pesapal to acknowledge
      return res.status(200).json({
        orderNotificationType: OrderNotificationType,
        orderTrackingId: OrderTrackingId,
        orderMerchantReference: OrderMerchantReference,
        status: 200
      });
    }

    let nextStatus: 'Paid' | 'Failed' | 'Cancelled' | 'Pending' = 'Pending'; 
    const upperStatus = String(paymentStatus).toUpperCase(); 

    if (upperStatus === 'COMPLETED') { 
      nextStatus = 'Paid'; 
    } else if (upperStatus === 'FAILED') { 
      nextStatus = 'Failed'; 
    } else if (upperStatus === 'CANCELLED' || upperStatus === 'INVALID') { 
      nextStatus = 'Cancelled'; 
    } 

    if (nextStatus !== 'Pending') {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: nextStatus,
          pesapal_order_tracking_id: String(OrderTrackingId)
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('IPN Error: Failed to update order status', updateError);
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      // 4. If Paid, Update Inventory and Send Email
      if (nextStatus === 'Paid') {
        // Decrement Inventory
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('product_id, quantity, size, color, product_name')
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

        // Send Confirmation Email
        const emailHtml = `
          <h1>Order Confirmed!</h1>
          <p>Hi ${order.customer_name},</p>
          <p>Thank you for your purchase. We have received your payment for order <strong>${order.pesapal_merchant_reference}</strong>.</p>
          <p><strong>Total Amount:</strong> KES ${order.total_amount}</p>
          <p>We are now preparing your order for ${order.delivery_type === 'pickup' ? 'pickup' : 'delivery'}.</p>
          <p>Best regards,<br/>Opulent Cosmetics Team</p>
        `;
        await sendEmail(order.email, `Order Confirmed - ${order.pesapal_merchant_reference}`, emailHtml);

        // Send Shop Notification Email
        const shopEmailHtml = ` 
          <h2>🛍️ New Order Received!</h2> 
          <p><strong>Order Reference:</strong> ${order.pesapal_merchant_reference}</p> 
          <p><strong>Customer:</strong> ${order.customer_name}</p> 
          <p><strong>Phone:</strong> ${order.phone}</p> 
          <p><strong>Email:</strong> ${order.email}</p> 
          <p><strong>Delivery Type:</strong> ${order.delivery_type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}</p> 
          ${order.delivery_address ? `<p><strong>Address:</strong> ${order.delivery_address}</p>` : ''} 
          ${order.delivery_area ? `<p><strong>Zone:</strong> ${order.delivery_area}</p>` : ''} 
          <p><strong>Total Paid:</strong> KES ${order.total_amount}</p> 
          <hr/> 
          <h3>Items Ordered:</h3> 
          ${orderItems?.map((item: { product_name: string; size?: string; color?: string; quantity: number }) => ` 
            <p>• ${item.product_name} 
               ${item.size ? `| Size: ${item.size}` : ''} 
               ${item.color ? `| Color: ${item.color}` : ''} 
               | Qty: ${item.quantity} 
            </p> 
          `).join('') || 'See dashboard for full item details'} 
        `; 

        const shopEmails = process.env.SHOP_NOTIFICATION_EMAIL ? process.env.SHOP_NOTIFICATION_EMAIL.split(',') : [];
        for (const email of shopEmails) {
          await sendEmail( 
            email.trim(), 
            `🛍️ New Paid Order - ${order.pesapal_merchant_reference}`, 
            shopEmailHtml 
          );
        }
      }
    }

    // 5. Acknowledge the IPN to Pesapal
    // Pesapal V3 expects a 200 OK with the tracking ID and reference
    return res.status(200).json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200
    });

  } catch (error: any) {
    console.error('IPN Handler Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
