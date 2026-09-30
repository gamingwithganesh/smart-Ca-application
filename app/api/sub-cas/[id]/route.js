import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ message: 'Only CA Firm Admins can edit Sub-CAs' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const subCa = await User.findOne({ _id: id, parentCa: auth.user._id, role: 'sub_ca' });
    if (!subCa) {
      return NextResponse.json({ message: 'Sub-CA not found under your firm' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, password, status } = body;

    if (name) subCa.name = name.trim();
    if (email) subCa.email = email.toLowerCase().trim();
    if (phone !== undefined) subCa.phone = phone.trim();
    if (status) subCa.status = status;
    if (password && password.trim().length >= 6) {
      subCa.password = password.trim();
    }

    await subCa.save();

    return NextResponse.json({
      message: 'Sub-CA updated successfully',
      subCa: {
        id: subCa._id,
        name: subCa.name,
        email: subCa.email,
        phone: subCa.phone,
        status: subCa.status
      }
    });
  } catch (error) {
    console.error('Update sub-ca error:', error);
    return NextResponse.json({ message: error.message || 'Error updating Sub-CA' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ message: 'Only CA Firm Admins can delete Sub-CAs' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const deleted = await User.findOneAndDelete({ _id: id, parentCa: auth.user._id, role: 'sub_ca' });
    if (!deleted) {
      return NextResponse.json({ message: 'Sub-CA not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Sub-CA removed successfully' });
  } catch (error) {
    console.error('Delete sub-ca error:', error);
    return NextResponse.json({ message: 'Error removing Sub-CA' }, { status: 500 });
  }
}
