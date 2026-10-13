/**
 * auth.routes.js
 * Replaces Python finance_app/routes/auth.py
 * GET  /login  → render HTML login page for browser / JSON for API
 * POST /login  → verify credentials → sign JWT → set HTTP-only cookie
 * GET  /logout → clear cookie
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken, getJwtTtl } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/login', (req, res) => {
  if (req.headers.accept && !req.headers.accept.includes('text/html')) {
    return res.json({ message: 'Login required' });
  }

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CenterAlign - Login</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0d14; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    form { background: #161e2e; padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); width: 340px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { margin-top: 0; margin-bottom: 1.5rem; text-align: center; color: #06b6d4; }
    label { display: block; font-size: 0.85rem; margin-bottom: 0.35rem; color: #94a3b8; }
    input { width: 100%; box-sizing: border-box; padding: 0.65rem; margin-bottom: 1.25rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: #0f172a; color: #fff; font-size: 0.95rem; }
    button { width: 100%; padding: 0.75rem; border-radius: 6px; border: none; background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <form id="login-form" method="POST" action="/login">
    <h2>CenterAlign</h2>
    <label for="username">Username</label>
    <input name="username" id="username" type="text" value="operator" required autofocus />
    <label for="password">Password</label>
    <input name="password" id="password" type="password" value="password" required />
    <button type="submit" id="submit-login-button">Log In</button>
  </form>
</body>
</html>`);
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const isFormSubmit = req.headers['content-type']?.includes('application/x-www-form-urlencoded') ||
                       (req.headers.accept?.includes('text/html') && !req.xhr);

  if (!username || !password) {
    if (isFormSubmit) {
      return res.redirect('/login?error=missing_fields');
    }
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await User.findOne({ username: username.trim() });
  if (!user) {
    if (isFormSubmit) {
      return res.redirect('/login?error=invalid_credentials');
    }
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    if (isFormSubmit) {
      return res.redirect('/login?error=invalid_credentials');
    }
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signToken(user);
  res.cookie('session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: getJwtTtl() * 1000,
  });

  if (isFormSubmit) {
    return res.redirect('/dashboard');
  }

  return res.json({ ok: true, user: user.toSafeObject() });
});

router.get('/logout', (_req, res) => {
  res.clearCookie('session_token');
  if (_req.headers.accept?.includes('text/html')) {
    return res.redirect('/login');
  }
  return res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const token = req.cookies?.session_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'centralign-jwt-secret-key');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    return res.json({ user: user.toSafeObject() });
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
});

export default router;
