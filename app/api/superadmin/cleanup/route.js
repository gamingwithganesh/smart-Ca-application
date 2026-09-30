import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import { requireSuperAdmin } from '@/lib/auth';

export async function POST(req) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();

    // Preserve super admin accounts
    const superAdminEmails = [
      'admin@zintech.in',
      'admin.zintech.in',
      'superadmin@zintech.in',
      'superadmin@smartca.com'
    ];

    // Find all demo/test CA and sub-account users to delete
    const usersToDelete = await User.find({
      email: { $nin: superAdminEmails },
      role: { $ne: 'superadmin' }
    });

    const userIds = usersToDelete.map(u => u._id);

    // Delete associated documents and clients
    const [deletedDocs, deletedClients, deletedUsers] = await Promise.all([
      Document.deleteMany({ uploadedBy: { $in: userIds } }),
      Client.deleteMany({ createdBy: { $in: userIds } }),
      User.deleteMany({ _id: { $in: userIds } })
    ]);

    return NextResponse.json({
      message: 'All demo CA firms, test clients, and test documents have been removed successfully.',
      deletedCounts: {
        caFirmsAndUsers: deletedUsers.deletedCount,
        clients: deletedClients.deletedCount,
        documents: deletedDocs.deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup demo data error:', error);
    return NextResponse.json({ message: error.message || 'Error cleaning demo data' }, { status: 500 });
  }
}
