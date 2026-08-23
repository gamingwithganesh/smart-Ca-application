import twilio from 'twilio';

const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const twilioNumber = (process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886').trim();

let twilioClient = null;

if (accountSid && authToken && !accountSid.includes('your_')) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (err) {
    console.error('Failed to initialize Twilio SDK client:', err.message);
  }
}

/**
 * Ensures phone number is in twilio format (e.g. "whatsapp:+17372212163")
 */
export function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let clean = phone.trim().replace(/[^\d+]/g, '');
  if (!clean.startsWith('+')) {
    clean = `+${clean}`;
  }
  if (!clean.startsWith('whatsapp:')) {
    return `whatsapp:${clean}`;
  }
  return clean;
}

/**
 * Formats configured Twilio sender number
 */
export function getTwilioSenderNumber() {
  return formatWhatsAppNumber(twilioNumber);
}

/**
 * Send WhatsApp text message via Twilio SDK
 */
export async function sendWhatsAppMessage({ to, body, statusCallback }) {
  if (!twilioClient) {
    throw new Error('Twilio credentials not configured. Please verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables.');
  }

  const formattedTo = formatWhatsAppNumber(to);
  const formattedFrom = getTwilioSenderNumber();

  const options = {
    from: formattedFrom,
    to: formattedTo,
    body
  };

  if (statusCallback) {
    options.statusCallback = statusCallback;
  }

  try {
    const res = await twilioClient.messages.create(options);
    return res;
  } catch (err) {
    if (err.code === 63015 || err.code === 21610 || err.message?.toLowerCase().includes('sandbox')) {
      throw new Error('Recipient has not joined the Twilio WhatsApp Sandbox. Please text "join <sandbox-keyword>" to ' + twilioNumber + ' on WhatsApp first.');
    }
    throw new Error(`Twilio send failed: ${err.message}`);
  }
}

/**
 * Send WhatsApp media (PDF, Excel, Word, Image) via Twilio SDK
 */
export async function sendWhatsAppMedia({ to, mediaUrl, body, statusCallback }) {
  if (!twilioClient) {
    throw new Error('Twilio credentials not configured. Please verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables.');
  }

  const formattedTo = formatWhatsAppNumber(to);
  const formattedFrom = getTwilioSenderNumber();

  const options = {
    from: formattedFrom,
    to: formattedTo,
    mediaUrl: Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl]
  };

  if (body) {
    options.body = body;
  }

  if (statusCallback) {
    options.statusCallback = statusCallback;
  }

  try {
    const res = await twilioClient.messages.create(options);
    return res;
  } catch (err) {
    if (err.code === 63015 || err.code === 21610 || err.message?.toLowerCase().includes('sandbox')) {
      throw new Error('Recipient has not joined the Twilio WhatsApp Sandbox. Please text "join <sandbox-keyword>" to ' + twilioNumber + ' on WhatsApp first.');
    }
    throw new Error(`Twilio media send failed: ${err.message}`);
  }
}

/**
 * Validate incoming Twilio webhook requests using Twilio Auth Token
 */
export function validateTwilioWebhook(twilioSignature, url, params) {
  if (!authToken) return false;
  return twilio.validateRequest(authToken, twilioSignature, url, params);
}
