import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    const query = auth.isSuperAdmin
      ? { _id: clientId }
      : { _id: clientId, createdBy: auth.effectiveCaId };

    const client = await Client.findOne(query).populate('createdBy', 'name firmName');
    if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();
    const resolvedParams = await params;
    const clientId = resolvedParams.id;
    const body = await req.json();

    const query = auth.isSuperAdmin
      ? { _id: clientId }
      : { _id: clientId, createdBy: auth.effectiveCaId };

    const client = await Client.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!client) return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });

    // If portalPassword is provided, update or create the User account
    if (portalPassword && portalPassword.trim()) {
      const User = (await import('@/lib/models/User')).default;
      let user = null;
      if (client.userId) {
        user = await User.findById(client.userId);
      }
      if (!user) {
        const cleanPhone = client.whatsappNumber || '';
        const cleanEmail = client.email || `${cleanPhone.replace(/\D/g, '')}@client.smartca.com`;
        user = await User.findOne({
          $or: [
            { email: cleanEmail },
            { phone: cleanPhone }
          ]
        });
      }

      if (user) {
        user.password = portalPassword.trim();
        user.role = 'client';
        user.clientId = client._id;
        await user.save();
        if (!client.userId) {
          client.userId = user._id;
          await client.save();
        }
      } else {
        const cleanPhone = client.whatsappNumber || '';
        const cleanEmail = client.email || `${cleanPhone.replace(/\D/g, '')}@client.smartca.com`;
        user = new User({
          name: client.name,
          email: cleanEmail,
          phone: cleanPhone,
          password: portalPassword.trim(),
          role: 'client',
          clientId: client._id,
          status: 'active'
        });
        await user.save();
        client.userId = user._id;
        await client.save();
      }
    }

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error updating client' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    const query = auth.isSuperAdmin
      ? { _id: clientId }
      : { _id: clientId, createdBy: auth.effectiveCaId };

    const client = await Client.findOneAndDelete(query);
    if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

    await Document.deleteMany({ clientId: clientId });
    return NextResponse.json({ message: 'Client and associated documents deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
