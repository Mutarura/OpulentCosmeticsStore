import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const rateWindowMs = 5 * 60 * 1000;
const rateLimit = 60;
const rateStore = new Map<string, { ts: number; count: number }>();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  if (ALLOWED_ORIGINS.length > 0) {
    const origin = (req.headers.origin as string) || '';
    const referer = (req.headers.referer as string) || '';
    const ok = ALLOWED_ORIGINS.some(o => origin.includes(o) || referer.includes(o));
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
});
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  const ipHeader = (req.headers['x-forwarded-for'] as string) || '';
  const ip =
    (req.ip as string) ||
    ipHeader.split(',').shift()?.trim() ||
    (req.socket.remoteAddress as string) ||
    'unknown';
  const now = Date.now();
  const existing = rateStore.get(ip);
  if (!existing || now - existing.ts > rateWindowMs) {
    rateStore.set(ip, { ts: now, count: 1 });
    return next();
  }
  if (existing.count >= rateLimit) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  existing.count += 1;
  return next();
});

// Import API handlers dynamically to ensure env vars are loaded first
// Note: Using .ts extension for tsx execution
const { default: createOrder } = await import('./api/payments/create-order.ts');
const { default: verifyPayment } = await import('./api/payments/verify-payment.ts');

// Helper to adapt Express req/res to Vercel handler signature if needed
// Vercel handlers are (req, res) => void | Promise<void>
// Express handlers are (req, res, next) => void
const adapt = (handler: any) => async (req: express.Request, res: express.Response, next: express.NextFunction) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    await handler(req, res);
  } catch (err) {
    next(err);
  }
};

// Routes
app.post('/api/payments/create-order', adapt(createOrder));
app.post('/api/payments/verify-payment', adapt(verifyPayment));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Opulent Cosmetics API' });
});

app.listen(PORT, () => {
  console.log(`> API Server running at http://localhost:${PORT}`);
});
