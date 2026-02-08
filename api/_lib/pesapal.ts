import axios from 'axios';

const PESAPAL_ENV = process.env.PESAPAL_ENV || 'live'; // 'sandbox' or 'live'
const BASE_URL = PESAPAL_ENV === 'sandbox' 
  ? 'https://cybqa.pesapal.com/pesapalv3' 
  : 'https://pay.pesapal.com/v3';

export const getPesapalToken = async () => {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('Missing Pesapal credentials');
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
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
      throw new Error(response.data.message || 'Failed to authenticate with Pesapal');
    }
  } catch (error: any) {
    console.error('Pesapal Auth Error:', error.response?.data || error.message);
    throw new Error('Pesapal authentication failed');
  }
};

export const registerIPN = async (token: string) => {
    // Ideally, IPN registration happens once, or we use a pre-registered ID from env
    // But if we needed to register dynamically:
    /*
    const response = await axios.post(
        `${BASE_URL}/api/URLSetup/RegisterIPN`,
        {
            url: 'https://your-domain.com/api/payments/webhook',
            ipn_notification_type: 'POST'
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.ipn_id;
    */
   // For now, we assume the user provides PESAPAL_IPN_ID in env as requested
   return process.env.PESAPAL_IPN_ID;
};

export const getTransactionStatus = async (orderTrackingId: string, token: string) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Pesapal Status Check Error:', error.response?.data || error.message);
        throw error;
    }
}

export const submitOrderRequest = async (token: string, orderDetails: any) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/Transactions/SubmitOrderRequest`,
            orderDetails,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Pesapal Submit Order Error:', error.response?.data || error.message);
        throw error;
    }
}
