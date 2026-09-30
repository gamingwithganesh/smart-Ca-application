import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let user = await User.findById(payload.userId)
      .select('-password')
      .populate({ path: 'parentCa', select: 'name firmName email status pauseReason', strictPopulate: false })
      .catch(() => null);

    if (!user) {
      user = await User.findById(payload.userId).select('-password');
    }

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Determine if account or parent firm is paused
    const isSelfPaused = user.status === 'paused' || user.status === 'suspended';
    const isParentPaused = user.role === 'sub_ca' && user.parentCa && (user.parentCa.status === 'paused' || user.parentCa.status === 'suspended');

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'admin',
      status: user.status || 'active',
      isPaused: isSelfPaused || isParentPaused,
      pauseReason: user.pauseReason || (isParentPaused ? user.parentCa?.pauseReason : '') || '',
      parentCa: user.parentCa || null,
      firmName: user.firmName || (user.parentCa ? user.parentCa.firmName : ''),
      firmCity: user.firmCity || '',
      phone: user.phone || '',
      subscription: user.subscription || null,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
