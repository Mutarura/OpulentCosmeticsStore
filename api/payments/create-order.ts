import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cartItems, customerInfo, deliveryType = 'delivery', deliveryZoneId, deliveryAddress } = req.body;

  if (!cartItems || cartItems.length === 0 || !customerInfo) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (deliveryType === 'delivery' && !deliveryZoneId) {
    return res.status(400).json({ error: 'Delivery zone is required for delivery orders' });
  }

  if (deliveryType !== 'delivery' && deliveryType !== 'pickup') {
    return res.status(400).json({ error: 'Invalid delivery type' });
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

      const availableStock = inventoryData?.quantity || 0;
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for ${productData.name} (${item.selectedSize || 'Standard'})`);
      }

      const price = productData.discount_price || productData.price;
      subtotal += price * item.quantity;

      orderItemsData.push({
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: price,
        size: item.selectedSize || null,
        color: item.selectedColor || null,
        product_name: productData.name,
      });
    }

    // 2. Calculate Delivery Fee & Total
    let deliveryFee = 0;
    let zoneIdToStore = null;
    let addressToStore = null;
    let deliveryArea = null;

    if (deliveryType === 'delivery') {
      const { data: zoneData, error: zoneError } = await supabaseAdmin
        .from('delivery_zones')
        .select('fee, name')
        .eq('id', deliveryZoneId)
        .single();

      if (zoneError || !zoneData) {
        throw new Error('Invalid delivery zone');
      }

      deliveryFee = Number(zoneData.fee);
      zoneIdToStore = deliveryZoneId;
      addressToStore = deliveryAddress;
      deliveryArea = zoneData.name;
    }

    const totalAmount = subtotal + deliveryFee;

    // 3. Generate Paystack Reference
    const reference = `ORD-${Date.now()}-${uuidv4().split('-')[0]}`;

    // 4. Create Order (Pending)
    // Mapping: pesapal_merchant_reference -> Paystack Reference
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        email: customerInfo.email,
        phone: customerInfo.phone,
        delivery_type: deliveryType,
        delivery_zone_id: zoneIdToStore,
        delivery_area: deliveryArea,
        delivery_fee: deliveryFee,
        delivery_address: addressToStore,
        status: 'Pending',
        subtotal_amount: subtotal,
        total_amount: totalAmount,
        currency: 'KES',
        pesapal_merchant_reference: reference, 
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error('Failed to create order record');
    }

    // 5. Create Order Items
    const itemsToInsert = orderItemsData.map(item => ({
      order_id: orderData.id,
      ...item,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      throw new Error('Failed to add items to order');
    }

    // 6. Return Paystack Config
    return res.status(200).json({
      reference,
      amount: totalAmount * 100, // Convert to kobo/cents for Paystack
      email: customerInfo.email,
      currency: 'KES',
      orderId: orderData.id
    });

  } catch (error: any) {
    console.error('Order Creation Error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to create order' });
  }
}
