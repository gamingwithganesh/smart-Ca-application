import { NextResponse } from 'next/server';
import { getPublicRazorpayKey, SUBSCRIPTION_PLANS } from '@/lib/razorpay';

export async function GET() {
  try {
    const keyId = getPublicRazorpayKey();

    return NextResponse.json({
      success: true,
      keyId,
      currency: 'INR',
      plans: SUBSCRIPTION_PLANS
    });
  } catch (error) {
    console.error('Error fetching Razorpay config:', error);
    return NextResponse.json({ message: 'Failed to retrieve payment configuration' }, { status: 500 });
  }
}
