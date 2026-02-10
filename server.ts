import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers dynamically to ensure env vars are loaded first
// Note: Using .ts extension for tsx execution
const { default: initializePayment } = await import('./api/payments/initialize.ts');
const { default: webhookHandler } = await import('./api/payments/webhook.ts');

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
app.post('/api/payments/initialize', adapt(initializePayment));
app.all('/api/payments/webhook', adapt(webhookHandler));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Opulent Cosmetics API' });
});

app.listen(PORT, () => {
  console.log(`> API Server running at http://localhost:${PORT}`);
});
