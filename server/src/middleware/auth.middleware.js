/**
 * auth.middleware.js
 * Replaces Python finance_app/routes/auth.py → require_auth / decode_session_token
 * Uses JWT via jsonwebtoken instead of custom HMAC session cookie.
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'centralign-jwt-secret-key';

export function getJwtTtl() {
  if (process.env.INJECT_SESSION_EXPIRY === '1') return 5; // accelerated for testing
  return parseInt(process.env.JWT_TTL_SECONDS || '300', 10);
}

export function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: getJwtTtl() }
  );
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.session_token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.clearCookie('session_token');
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Administrative privileges required' });
    }
    next();
  });
}
