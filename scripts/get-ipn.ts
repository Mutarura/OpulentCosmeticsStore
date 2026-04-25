import axios from 'axios';

async function getIpn() {
  const consumerKey = "OMWUk7UC0kvm74ijd4MHnCI3JPtASpva";
  const consumerSecret = "Aqbgm30CxknGluzTJLlVrMG2kDY=";
  const baseUrl = 'https://pay.pesapal.com/v3';
  const webhookUrl = 'https://opulentcosmetics.shop/api/payments/webhook';

  console.log('--- Fetching Pesapal IPN ID ---');
  
  try {
    // 1. Get Token
    console.log('Step 1: Getting Auth Token...');
    const authResp = await axios.post(`${baseUrl}/api/Auth/RequestToken`, {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    });
    const token = authResp.data.token;

    // 2. Register/Get IPN ID
    console.log('Step 2: Registering/Fetching IPN ID...');
    const ipnResp = await axios.post(`${baseUrl}/api/URLSetup/RegisterIPN`, {
      url: webhookUrl,
      ipn_notification_type: 'GET'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n✅ SUCCESS!');
    console.log('Your PESAPAL_IPN_ID is:', ipnResp.data.ipn_id);
    console.log('\nCopy the UUID above and add it to your Vercel Environment Variables.');
  } catch (err: any) {
    console.error('\n❌ ERROR:', err.response?.data || err.message);
  }
}

getIpn();
