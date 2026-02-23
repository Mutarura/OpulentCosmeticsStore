
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PESAPAL_ENV = process.env.PESAPAL_ENV || 'sandbox';
const BASE_URL = PESAPAL_ENV === 'sandbox' 
  ? 'https://cybqa.pesapal.com/pesapalv3' 
  : 'https://pay.pesapal.com/v3';

const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error('Error: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in .env.local');
  process.exit(1);
}

const getPesapalToken = async () => {
  try {
    console.log(`Authenticating with Pesapal (${PESAPAL_ENV})...`);
    const response = await axios.post(
      `${BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    if (response.data.status === '200' && response.data.token) {
      return response.data.token;
    } else {
      console.log('Auth Response:', JSON.stringify(response.data, null, 2));
      throw new Error(response.data.message || 'Failed to authenticate');
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Auth Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    const message = (error as Error).message ?? String(error);
    console.error('Auth Error:', message);
    throw error;
  }
};

const registerIPN = async (url: string) => {
  try {
    const token = await getPesapalToken();
    console.log(`Registering IPN URL: ${url}`);

    const response = await axios.post(
      `${BASE_URL}/api/URLSetup/RegisterIPN`,
      {
        url: url,
        ipn_notification_type: 'POST',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\nSUCCESS! IPN Registered Successfully.');
    console.log('----------------------------------------');
    console.log(`IPN_ID: ${response.data.ipn_id}`);
    console.log('----------------------------------------');
    console.log('\nPlease add this ID to your .env.local file:');
    console.log(`PESAPAL_IPN_ID=${response.data.ipn_id}`);
    
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Registration Error:', error.response?.data || error.message);
    } else {
      const message = (error as Error).message ?? String(error);
      console.error('Registration Error:', message);
    }
  }
};

const ipnUrl = process.argv[2];

if (!ipnUrl) {
  console.error('\nUsage: npx tsx scripts/register-pesapal-ipn.ts <YOUR_WEBHOOK_URL>');
  console.error('Example: npx tsx scripts/register-pesapal-ipn.ts https://my-app.ngrok-free.app/api/payments/webhook\n');
  process.exit(1);
}

registerIPN(ipnUrl);
