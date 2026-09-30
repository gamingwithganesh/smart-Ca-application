import Razorpay from 'razorpay';
import crypto from 'crypto';

// Server-only Razorpay credentials
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();
const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

/**
 * Server-side Subscription Plans Configuration (Source of Truth)
 * Never trust pricing sent from client.
 */
export const SUBSCRIPTION_PLANS = {
  Starter: {
    id: 'Starter',
    name: 'Starter Practice',
    description: 'Ideal for solo practitioners and small CA firms',
    prices: {
      monthly: 999,
      quarterly: 2699,
      annual: 9590
    },
    durationDays: {
      monthly: 30,
      quarterly: 90,
      annual: 365
    },
    maxSubCas: 2,
    maxClients: 50,
    features: [
      'Up to 2 Sub-CAs / Associates',
      'Up to 50 Active Clients',
      'Automated Document Watermarking',
      'Standard WhatsApp Integration',
      'Client Document Vault & Portal'
    ]
  },
  Professional: {
    id: 'Professional',
    name: 'Professional Firm',
    description: 'Most popular for growing CA firms & audit practices',
    prices: {
      monthly: 2499,
      quarterly: 6749,
      annual: 23990
    },
    durationDays: {
      monthly: 30,
      quarterly: 90,
      annual: 365
    },
    maxSubCas: 5,
    maxClients: 200,
    features: [
      'Up to 5 Sub-CAs / Associates',
      'Up to 200 Active Clients',
      'AWS Bedrock AI WhatsApp Assistant',
      'Document Auto-Retrieval & Payment Wall',
      'Multi-Year Tax Returns Vault',
      'Priority Support'
    ]
  },
  Enterprise: {
    id: 'Enterprise',
    name: 'Enterprise Practice',
    description: 'For large firms with multi-branch CA teams and high client volume',
    prices: {
      monthly: 5999,
      quarterly: 16199,
      annual: 57590
    },
    durationDays: {
      monthly: 30,
      quarterly: 90,
      annual: 365
    },
    maxSubCas: 20,
    maxClients: 1000,
    features: [
      'Up to 20 Sub-CAs / Associates',
      'Up to 1,000 Active Clients',
      'Unlimited AWS Bedrock AI Bot Queries',
      'Custom WhatsApp Business API Support',
      'Dedicated Account Manager & SLA',
      'Custom Watermarks & Branding'
    ]
  }
};

/**
 * Returns a configured Razorpay instance.
 */
export function getRazorpayInstance() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.warn('⚠️ Razorpay credentials are not fully configured in environment variables.');
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: RAZORPAY_KEY_SECRET || 'secret_placeholder'
  });
}

/**
 * Creates a Razorpay order on server.
 * Handles both live Razorpay API and mock test fallbacks if offline.
 */
export async function createRazorpayOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
  const instance = getRazorpayInstance();

  const options = {
    amount: amountInPaise,
    currency,
    receipt: receipt.substring(0, 40), // Razorpay limit receipt to 40 chars
    notes: {
      ...notes,
      platform: 'Smart CA Vault'
    }
  };

  try {
    const order = await instance.orders.create(options);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      isMock: false
    };
  } catch (err) {
    console.warn('⚠️ Razorpay API order creation error (or test keys invalid):', err.message);

    // If test mode or mock key is provided, generate a formatted test order for seamless local testing
    if (
      !RAZORPAY_KEY_ID ||
      RAZORPAY_KEY_ID.includes('Mock') ||
      RAZORPAY_KEY_SECRET.includes('Mock') ||
      process.env.NODE_ENV !== 'production'
    ) {
      const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return {
        orderId: mockOrderId,
        amount: amountInPaise,
        currency,
        receipt,
        isMock: true
      };
    }

    throw new Error(`Razorpay Order Creation Failed: ${err.message}`);
  }
}

/**
 * Verifies Razorpay payment signature (Server-Side).
 * Cryptographically validates razorpay_order_id + "|" + razorpay_payment_id with RAZORPAY_KEY_SECRET.
 */
export function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id) {
    return false;
  }

  // Handle mock test orders in development
  if (
    (razorpay_order_id.startsWith('order_test_') || razorpay_payment_id.startsWith('pay_test_')) &&
    process.env.NODE_ENV !== 'production'
  ) {
    return true;
  }

  if (!RAZORPAY_KEY_SECRET) {
    console.error('❌ Cannot verify signature: RAZORPAY_KEY_SECRET is missing');
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  return generatedSignature === razorpay_signature;
}

/**
 * Verifies Razorpay Webhook signature against raw request body.
 */
export function verifyWebhookSignature(rawBody, signature, webhookSecret = RAZORPAY_WEBHOOK_SECRET) {
  if (!signature || !webhookSecret) {
    return false;
  }

  // Development mock bypass for local testing
  if (webhookSecret.includes('Mock') && process.env.NODE_ENV !== 'production') {
    return true;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody))
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}

/**
 * Returns public key safely to frontend
 */
export function getPublicRazorpayKey() {
  return RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_51MockSmartCAKey';
}
