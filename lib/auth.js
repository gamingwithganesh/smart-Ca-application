import jwt from 'jsonwebtoken';
import dbConnect from './db';
import User from './models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_ca_secure_prod_jwt_secret_key_2026';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set! Using default secret.');
}

export function signToken(userOrId) {
  if (typeof userOrId === 'object' && userOrId !== null) {
    return jwt.sign(
      {
        userId: userOrId._id || userOrId.id,
        role: userOrId.role || 'admin',
        email: userOrId.email,
        name: userOrId.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
  return jwt.sign({ userId: userOrId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(req) {
  try {
    let authHeader = null;
    if (req.headers && typeof req.headers.get === 'function') {
      authHeader = req.headers.get('authorization');
    } else if (req.headers && req.headers.authorization) {
      authHeader = req.headers.authorization;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // returns { userId, role, email, ... }
  } catch (err) {
    return null;
  }
}

/**
 * Validates token and returns authenticated DB user.
 * Also checks if the account or parent CA firm is paused/suspended.
 */
export async function getAuthenticatedUser(req) {
  await dbConnect();
  const payload = verifyToken(req);
  if (!payload || !payload.userId) {
    return { user: null, error: 'Unauthorized', status: 401 };
  }

  const user = await User.findById(payload.userId).select('-password');
  if (!user) {
    return { user: null, error: 'User not found', status: 404 };
  }

  // Ensure role is correctly identified
  if (user.email === 'superadmin@smartca.com' || payload.role === 'superadmin' || user.role === 'superadmin') {
    user.role = 'superadmin';
    return { user, isSuperAdmin: true };
  }

  // Check if this user account itself is paused / suspended
  if (user.status === 'paused' || user.status === 'suspended') {
    return {
      user,
      isPaused: true,
      error: `Your account is currently paused (${user.pauseReason || 'Subscription / Billing pending'}). Please contact Super Admin.`,
      status: 403
    };
  }

  // If sub_ca, check parent CA firm status
  if (user.role === 'sub_ca') {
    if (!user.parentCa) {
      return { user: null, error: 'Parent CA firm not found for this Sub-CA', status: 400 };
    }
    const parent = await User.findById(user.parentCa);
    if (!parent || parent.status === 'paused' || parent.status === 'suspended') {
      return {
        user,
        isPaused: true,
        error: `Parent CA Firm account is paused (${parent?.pauseReason || 'Subscription renewal required'}). Sub-CA operations are restricted.`,
        status: 403
      };
    }
    return { user, parentCa: parent, effectiveCaId: parent._id, isSubCa: true };
  }

  // If role is client (Taxpayer)
  if (user.role === 'client') {
    return { user, isClient: true, clientId: user.clientId };
  }

  // For CA Admin, effectiveCaId is self
  return { user, effectiveCaId: user._id, isCaAdmin: true };
}

/**
 * Super Admin authorization guard
 */
export async function requireSuperAdmin(req) {
  const auth = await getAuthenticatedUser(req);
  if (auth.error || !auth.user) {
    return { error: auth.error || 'Unauthorized', status: auth.status || 401 };
  }
  if (auth.user.role !== 'superadmin' && auth.user.email !== 'superadmin@smartca.com') {
    return { error: 'Access denied: Super Admin privilege required.', status: 403 };
  }
  return { user: auth.user };
}
