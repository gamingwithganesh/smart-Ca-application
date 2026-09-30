import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    await dbConnect();

    const ca = await User.findOne({ _id: id, role: { $ne: 'superadmin' } }).select('-password');
    if (!ca) {
      return NextResponse.json({ message: 'CA firm not found' }, { status: 404 });
    }

    // Get sub-CAs
    const subCas = await User.find({ parentCa: id, role: 'sub_ca' }).select('-password');
    const clientCount = await Client.countDocuments({ createdBy: id });
    const documentCount = await Document.countDocuments({ uploadedBy: id });

    return NextResponse.json({
      ca,
      subCas,
      stats: {
        subCaCount: subCas.length,
        clientCount,
        documentCount
      }
    });
  } catch (error) {
    console.error('Get CA details error:', error);
    return NextResponse.json({ message: 'Error fetching CA details' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    await dbConnect();

    const ca = await User.findOne({ _id: id, role: { $ne: 'superadmin' } });
    if (!ca) {
      return NextResponse.json({ message: 'CA firm not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      email,
      firmName,
      firmCity,
      phone,
      password,
      status,
      pauseReason,
      subscription
    } = body;

    if (name) ca.name = name.trim();
    if (email) ca.email = email.toLowerCase().trim();
    if (firmName) ca.firmName = firmName.trim();
    if (firmCity !== undefined) ca.firmCity = firmCity.trim();
    if (phone !== undefined) ca.phone = phone.trim();
    if (status) ca.status = status;
    if (pauseReason !== undefined) ca.pauseReason = pauseReason;

    if (password && password.trim().length >= 6) {
      ca.password = password.trim(); // pre-save will hash
    }

    if (subscription) {
      ca.subscription = {
        ...ca.subscription?.toObject(),
        ...subscription,
        expiresAt: subscription.expiresAt ? new Date(subscription.expiresAt) : ca.subscription?.expiresAt
      };
    }

    await ca.save();

    return NextResponse.json({
      message: 'CA Firm details updated successfully',
      ca: {
        id: ca._id,
        name: ca.name,
        email: ca.email,
        firmName: ca.firmName,
        status: ca.status,
        subscription: ca.subscription
      }
    });
  } catch (error) {
    console.error('Update CA error:', error);
    return NextResponse.json({ message: error.message || 'Error updating CA' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    await dbConnect();

    const ca = await User.findOne({ _id: id, role: { $ne: 'superadmin' } });
    if (!ca) {
      return NextResponse.json({ message: 'CA firm not found' }, { status: 404 });
    }

    // Delete sub-CAs under this CA
    await User.deleteMany({ parentCa: id });
    
    // Delete documents and clients
    await Document.deleteMany({ uploadedBy: id });
    await Client.deleteMany({ createdBy: id });

    // Delete CA
    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: 'CA firm and all associated sub-accounts and data removed successfully.' });
  } catch (error) {
    console.error('Delete CA error:', error);
    return NextResponse.json({ message: error.message || 'Error deleting CA' }, { status: 500 });
  }
}
