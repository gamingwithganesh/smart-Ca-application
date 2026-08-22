import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_ca_secure_prod_jwt_secret_key_2026';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set! Using default secret.');
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
    return decoded; // returns { userId: ... }
  } catch (err) {
    return null;
  }
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

