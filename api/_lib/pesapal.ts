import axios from 'axios';

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const PESAPAL_ENV = process.env.PESAPAL_ENV || 'production';

const BASE_URL =
  PESAPAL_ENV.toLowerCase() === 'sandbox'
    ? 'https://cybqa.pesapal.com/pesapalv3'
    : 'https://pay.pesapal.com/v3';

let cachedToken: { token: string; expiresAt: number } | null = null;

const nowSeconds = () => Math.floor(Date.now() / 1000);

export const requirePesapalEnv = () => {
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw new Error('Missing Pesapal credentials');
  }
};

export const getPesapalToken = async (): Promise<string> => {
  requirePesapalEnv();

  if (cachedToken && cachedToken.expiresAt > nowSeconds() + 60) {
    return cachedToken.token;
  }

  const resp = await axios.post(
    `${BASE_URL}/api/Auth/RequestToken`,
    {
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  // API returns { token: string, expiryDate: string }
  const token: string = resp.data?.token;
  const expiryDate: string | undefined = resp.data?.expiryDate;
  const expiresAt =
    expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : nowSeconds() + 1200;

  cachedToken = { token, expiresAt };
  return token;
};

export interface SubmitOrderParams {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  billing: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    line1?: string | null;
  };
}

export const submitPesapalOrder = async (params: SubmitOrderParams) => {
  const token = await getPesapalToken();
  const payload = {
    id: params.merchantReference,
    currency: params.currency,
    amount: Number(params.amount.toFixed(2)),
    description: params.description,
    callback_url: params.callbackUrl,
    billing_address: {
      email_address: params.billing.email,
      phone_number: params.billing.phone,
      first_name: params.billing.firstName,
      last_name: params.billing.lastName,
      line_1: params.billing.line1 || '',
      country_code: 'KE',
    },
  };

  const resp = await axios.post(
    `${BASE_URL}/api/Transactions/SubmitOrderRequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return resp.data; // expects { redirect_url, order_tracking_id, merchant_reference }
};

export const getPesapalTransactionStatus = async (orderTrackingId: string) => {
  const token = await getPesapalToken();
  const resp = await axios.get(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(
      orderTrackingId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return resp.data;
};

