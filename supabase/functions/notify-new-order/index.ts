// @ts-nocheck
import { serve } from 'std/http/server.ts'
import { Resend } from 'resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req: Request) => {
  const { record: order } = await req.json()

  // Generate dynamic shipping estimate based on Nairobi time (UTC+3)
  const nowNairobi = new Date(Date.now() + 3 * 60 * 60 * 1000)
  const hour = nowNairobi.getUTCHours()
  const day = nowNairobi.getUTCDay() // 0 = Sunday, 6 = Saturday 
  const isWeekend = day === 0 || day === 6

  let shippingEstimate: string
  if (order.delivery_type === 'pickup') {
    shippingEstimate = hour < 17
      ? 'Your order is <strong>ready for pickup today</strong> at Two Rivers Mall (10am – 7pm).'
      : 'Your order will be <strong>ready for pickup tomorrow</strong> at Two Rivers Mall from 10am.'
  } else if (isWeekend) {
    shippingEstimate = 'Your order will be <strong>shipped first thing Monday morning</strong> and delivered by Monday afternoon.'
  } else if (hour < 12) {
    shippingEstimate = 'Your order was placed this morning — we aim to have it <strong>delivered to you today</strong>!'
  } else if (hour < 17) {
    shippingEstimate = 'Your order was placed this afternoon — we\'ll have it <strong>shipped today or first thing tomorrow</strong>.'
  } else {
    shippingEstimate = 'Your order was placed this evening — we\'ll have it <strong>shipped bright and early tomorrow morning</strong>.'
  }

  const html = `
    <div style="font-family:serif;max-width:600px;margin:0 auto;color:#333;">
      <h2 style="color:#E8601C;">Thank you for your order, ${order.customer_name}!</h2>
      <p>Order Reference: <strong>${order.pesapal_merchant_reference}</strong></p>
      
      <div style="background:#fff8f0;border-left:3px solid #E8601C;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;"> 
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;color:#E8601C;text-transform:uppercase;">Shipping Estimate</p> 
        <p style="margin:0;font-size:14px;color:#4a4540;line-height:1.6;">${shippingEstimate}</p> 
      </div> 

      <p style="font-size:14px;line-height:1.6;">
        We have received your payment of <strong>KSh ${Number(order.total_amount).toLocaleString()}</strong>. 
        Our team is now preparing your items.
      </p>

      <p style="font-size:12px;color:#9a9490;"> 
        We will send you an email when your order is out for delivery. 
        For urgent updates, WhatsApp us at 
        <a href="https://wa.me/254773198364" style="color:#E8601C;">0773 198 364</a>. 
      </p>
    </div>
  `

  await resend.emails.send({
    from: 'Opulent Cosmetics <onboarding@resend.dev>',
    to: order.email,
    subject: `Order Confirmation — ${order.pesapal_merchant_reference}`,
    html,
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
