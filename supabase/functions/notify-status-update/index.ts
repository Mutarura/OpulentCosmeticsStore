// @ts-nocheck
import { serve } from 'std/http/server.ts'
import { Resend } from 'resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req: Request) => {
  const { record: order, old_record: oldOrder } = await req.json()

  // Only notify for specific status changes
  const notifyStatuses = ['Out for Delivery', 'Delivered']
  if (!notifyStatuses.includes(order.status) || order.status === oldOrder?.status) {
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let statusMessage = ''
  let subject = ''
  
  if (order.status === 'Out for Delivery') {
    subject = `Your order is out for delivery! — ${order.pesapal_merchant_reference}`
    statusMessage = `Great news! Your order is currently with our delivery partner and will be arriving shortly at <strong>${order.delivery_address || 'your specified address'}</strong>.`
  } else if (order.status === 'Delivered') {
    subject = `Delivered! Enjoy your Opulent purchase — ${order.pesapal_merchant_reference}`
    statusMessage = `Your order has been successfully delivered. We hope you enjoy your new luxury beauty products! Thank you for choosing Opulent Cosmetics.`
  }

  const html = `
    <div style="font-family:serif;max-width:600px;margin:0 auto;color:#333;">
      <h2 style="color:#E8601C;">Order Status Update</h2>
      <p>Order Reference: <strong>${order.pesapal_merchant_reference}</strong></p>
      
      <div style="background:#fff8f0;border-left:3px solid #E8601C;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;"> 
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;color:#E8601C;text-transform:uppercase;">Status: ${order.status}</p> 
        <p style="margin:0;font-size:14px;color:#4a4540;line-height:1.6;">${statusMessage}</p> 
      </div> 

      <p style="font-size:12px;color:#9a9490;"> 
        For any inquiries, WhatsApp us at 
        <a href="https://wa.me/254773198364" style="color:#E8601C;">0773 198 364</a>. 
      </p>
    </div>
  `

  await resend.emails.send({
    from: 'Opulent Cosmetics <onboarding@resend.dev>',
    to: order.email,
    subject,
    html,
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
