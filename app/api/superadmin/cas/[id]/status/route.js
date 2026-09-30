import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { requireSuperAdmin } from '@/lib/auth';

export async function PATCH(req, { params }) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    await dbConnect();

    const body = await req.json();
    const { status, pauseReason, extendDays } = body;

    const ca = await User.findOne({ _id: id, role: { $ne: 'superadmin' } });
    if (!ca) {
      return NextResponse.json({ message: 'CA account not found' }, { status: 404 });
    }

    if (status) {
      ca.status = status;
      if (!ca.subscription) {
        ca.subscription = {};
      }
      ca.subscription.status = status === 'active' ? 'active' : 'paused';
    }

    if (pauseReason !== undefined) {
      ca.pauseReason = pauseReason;
    }

    // Optional quick subscription extension
    if (extendDays && Number(extendDays) > 0) {
      const currentExpiry = new Date(ca.subscription?.expiresAt || Date.now());
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + Number(extendDays));
      if (!ca.subscription) ca.subscription = {};
      ca.subscription.expiresAt = baseDate;
      ca.subscription.status = 'active';
      ca.status = 'active';
      ca.pauseReason = '';
    }

    await ca.save();

    return NextResponse.json({
      message: `Account status updated to ${ca.status}`,
      ca: {
        id: ca._id,
        name: ca.name,
        email: ca.email,
        status: ca.status,
        pauseReason: ca.pauseReason,
        subscription: ca.subscription
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({ message: error.message || 'Error updating status' }, { status: 500 });
  }
}
