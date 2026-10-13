/**
 * api.routes.js
 * Replaces Python finance_app/routes/api.py
 * GET /api/claims — read-only verifier endpoint (no auth required)
 */
import { Router } from 'express';
import ExpenseClaim from '../models/ExpenseClaim.js';

const router = Router();

router.get('/api/claims', async (req, res) => {
  const { employee } = req.query;
  const query = {};
  if (employee) {
    query.employee = { $regex: employee.trim(), $options: 'i' };
  }

  const claims = await ExpenseClaim.find(query).sort({ _id: 1 }).lean();

  const response = claims.map((c) => ({
    id:          c._id.toString(),
    _id:         c._id.toString(),
    employee:    c.employee,
    date:        c.date,
    category:    c.category,
    amount_inr:  c.amountInr,
    amountInr:   c.amountInr,
    vendor:      c.vendor,
    cost_center: c.costCenter,
    costCenter:  c.costCenter,
    receipt_id:  c.receiptId,
    receiptId:   c.receiptId,
    status:      c.status,
    createdAt:   c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString(),
  }));

  res.json(response);
});

export default router;
