/**
 * admin.routes.js
 * Replaces Python finance_app/routes/admin.py
 * GET  /admin           → admin-only dashboard data
 * POST /admin/reset-injections → reset fault injection state
 */
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { resetInjections } from '../middleware/injection.middleware.js';
import ExpenseClaim from '../models/ExpenseClaim.js';

const router = Router();

router.get('/admin', requireAdmin, async (req, res) => {
  const totalClaims = await ExpenseClaim.countDocuments();
  const statusBreakdown = await ExpenseClaim.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({
    user: req.user.toSafeObject(),
    stats: { totalClaims, statusBreakdown },
  });
});

router.post('/admin/reset-injections', requireAdmin, (req, res) => {
  resetInjections();
  res.json({ ok: true, message: 'Injection state reset' });
});

export default router;
