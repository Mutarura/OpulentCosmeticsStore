import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getPesapalToken, submitOrderRequest } from '../_lib/pesapal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cartItems, customerInfo, deliveryZoneId, deliveryAddress } = req.body;

  if (!cartItems || cartItems.length === 0 || !customerInfo || !deliveryZoneId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Validate Stock & Calculate Subtotal
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of cartItems) {
      const { data: productData, error: productError } = await supabaseAdmin
        .from('products')
        .select('price, discount_price, name')
        .eq('id', item.id)
        .single();

      if (productError || !productData) {
        throw new Error(`Product ${item.id} not found`);
      }

      // Check Inventory
      const { data: inventoryData } = await supabaseAdmin
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.id)
        .eq('size', item.selectedSize || null)
        .eq('color', item.selectedColor || null)
        .maybeSingle();

      if (inventoryData && inventoryData.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${productData.name}` });
      }

      const unitPrice = Number(productData.discount_price ?? productData.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItemsData.push({
        product_id: item.id,
        product_name: productData.name,
        size: item.selectedSize || null,
        color: item.selectedColor || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    // 2. Fetch Delivery Price
    const { data: zoneData, error: zoneError } = await supabaseAdmin
      .from('delivery_zones')
      .select('name, fee')
      .eq('id', deliveryZoneId)
      .single();

    if (zoneError || !zoneData) {
      return res.status(400).json({ error: 'Invalid delivery zone' });
    }

    const deliveryFee = Number(zoneData.fee);
    const totalAmount = subtotal + deliveryFee;
    
    // Generate Merchant Reference
    const merchantRef = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // 3. Create Order (Pending)
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        email: customerInfo.email,
        phone: customerInfo.phone,
        delivery_type: 'delivery',
        delivery_zone_id: deliveryZoneId,
        delivery_area: zoneData.name,
        delivery_fee: deliveryFee,
        delivery_address: deliveryAddress,
        status: 'Pending',
        subtotal_amount: subtotal,
        total_amount: totalAmount,
        currency: 'KES',
        pesapal_merchant_reference: merchantRef,
      })
      .select('id')
      .single();

    if (orderError) {
      throw orderError;
    }

    // 4. Create Order Items
    const itemsToInsert = orderItemsData.map(item => ({
      order_id: orderData.id,
      ...item,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      throw itemsError;
    }

    // 5. Initialize Pesapal Payment
    const token = await getPesapalToken();
    const callbackUrl = `${req.headers.origin || 'http://localhost:5173'}/cart?status=completed`;
    const ipnId = process.env.PESAPAL_IPN_ID;

    if (!ipnId) {
        throw new Error('PESAPAL_IPN_ID is not configured');
    }

    const orderDetails = {
        id: merchantRef,
        currency: 'KES',
        amount: totalAmount,
        description: `Payment for Order #${orderData.id.slice(0, 8)}`,
        callback_url: callbackUrl,
        notification_id: ipnId,
        billing_address: {
            email_address: customerInfo.email,
            phone_number: customerInfo.phone,
            country_code: 'KE', // Default to Kenya
            first_name: customerInfo.firstName,
            middle_name: '',
            last_name: customerInfo.lastName,
            line_1: deliveryAddress,
            line_2: zoneData.name,
            city: '',
            state: '',
            postal_code: '',
            zip_code: ''
        }
    };

    const pesapalResponse = await submitOrderRequest(token, orderDetails);

    if (pesapalResponse.redirect_url) {
        // Update order with the tracking ID if provided in response (Pesapal V3 returns order_tracking_id)
        if (pesapalResponse.order_tracking_id) {
            await supabaseAdmin
                .from('orders')
                .update({ pesapal_order_tracking_id: pesapalResponse.order_tracking_id })
                .eq('id', orderData.id);
        }

        return res.status(200).json({ link: pesapalResponse.redirect_url });
    } else {
        throw new Error('Failed to get redirect URL from Pesapal');
    }

  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
