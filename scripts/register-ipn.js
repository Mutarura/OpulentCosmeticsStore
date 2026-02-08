import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually since we don't have dotenv
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const CONSUMER_KEY = envVars['PESAPAL_CONSUMER_KEY'];
const CONSUMER_SECRET = envVars['PESAPAL_CONSUMER_SECRET'];
const ENV = envVars['PESAPAL_ENV'] || 'live';

const BASE_URL = ENV === 'sandbox' 
  ? 'https://cybqa.pesapal.com/pesapalv3' 
  : 'https://pay.pesapal.com/v3';

async function registerIPN() {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.error('Error: Missing PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET in .env.local');
    process.exit(1);
  }

  const webhookUrl = process.argv[2];
  
  // Validation
  if (!webhookUrl) {
    console.error('\nError: Webhook URL is required.');
    console.error('Usage: node scripts/register-ipn.js <YOUR_PUBLIC_WEBHOOK_URL>');
    process.exit(1);
  }

  if (webhookUrl.includes('<YOUR_DEPLOYED_DOMAIN>')) {
    console.error('\nError: You are using the placeholder URL.');
    console.error('Please replace "<YOUR_DEPLOYED_DOMAIN>" with your actual deployed domain (e.g. https://opulent-cosmetics.vercel.app)');
    process.exit(1);
  }

  if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
     console.warn('\nWARNING: You are using a localhost URL.');
     console.warn('Pesapal cannot call localhost directly. Ensure you are using a tunnel (like ngrok) or this will fail during payment.');
  }

  try {
    // 1. Get Token
    const authRes = await axios.post(
      `${BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET,
      },
      {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      }
    );

    const token = authRes.data.token;
    console.log('Auth successful. Token received.');

    // 2. Register IPN
    console.log(`Registering IPN for: ${webhookUrl}...`);
    
    const regRes = await axios.post(
      `${BASE_URL}/api/URLSetup/RegisterIPN`,
      {
        url: webhookUrl,
        ipn_notification_type: 'POST', 
      },
      {
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
      }
    );

    const ipnId = regRes.data.ipn_id;
    console.log('\nSUCCESS! IPN Registered.');
    console.log('==========================================');
    console.log(`PESAPAL_IPN_ID=${ipnId}`);
    console.log('==========================================');
    console.log('Please add this ID to your .env.local file.');

  } catch (error) {
    console.error('\nError registering IPN:');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
    } else {
        console.error(error.message);
    }
  }
}

registerIPN();
