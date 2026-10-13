/**
 * claims.routes.js
 * Replaces Python finance_app/routes/claims.py
 * Supports both JSON API (for React SPA) and HTML responses (for Playwright browser automation)
 */
import { Router } from 'express';
import ExpenseClaim from '../models/ExpenseClaim.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const POLICY_AS_OF_DATE = process.env.POLICY_AS_OF_DATE || '2026-10-13';

function getPolicyDate() {
  return new Date(POLICY_AS_OF_DATE);
}

// GET /dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  if (req.headers.accept?.includes('text/html')) {
    return res.redirect('/claims');
  }
  res.json({ ok: true, user: req.user.toSafeObject() });
});

// GET /claims — list all claims
router.get('/claims', requireAuth, async (req, res) => {
  const claims = await ExpenseClaim.find().sort({ _id: -1 }).lean();

  if (req.headers.accept?.includes('text/html')) {
    const rows = claims.map((c) => {
      const amt = (c.amountInr || 0).toFixed(2);
      return `<tr>
        <td>#${String(c._id).substring(0, 8)}</td>
        <td>${c.employee}</td>
        <td>${c.date}</td>
        <td>${c.category}</td>
        <td>${c.vendor}</td>
        <td>₹${amt}</td>
        <td>${c.costCenter || ''}</td>
        <td>${c.receiptId || ''}</td>
        <td><span class="badge">${c.status || 'SUBMITTED'}</span></td>
      </tr>`;
    }).join('\n');

    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CenterAlign - Claims Ledger</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0d14; color: #f8fafc; padding: 2rem; margin: 0; }
    h1 { color: #06b6d4; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; background: #161e2e; border-radius: 8px; overflow: hidden; }
    th, td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.9rem; }
    th { background: #0f172a; color: #94a3b8; text-transform: uppercase; font-size: 0.75rem; }
    .badge { background: rgba(14, 165, 233, 0.2); color: #38bdf8; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: bold; }
    .btn { display: inline-block; padding: 0.5rem 1rem; background: #06b6d4; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <h1>Claims Ledger</h1>
    <a href="/claims/new" class="btn">+ New Claim</a>
  </div>
  <table id="claims-table">
    <thead>
      <tr>
        <th>ID</th><th>Employee</th><th>Date</th><th>Category</th><th>Vendor</th><th>Amount</th><th>Cost Center</th><th>Receipt</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`);
  }

  return res.json({ claims });
});

// Helper for rendering new claim form
function renderNewClaimForm(values = {}, errorMsg = null) {
  const categories = ['Meals', 'Cab', 'Flight', 'Lodging', 'Software', 'Client entertainment', 'Other'];
  const catOptions = categories.map((c) =>
    `<option value="${c}" ${values.category === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CenterAlign - New Claim</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0d14; color: #f8fafc; padding: 2rem; margin: 0; }
    .card { max-width: 600px; margin: 0 auto; background: #161e2e; padding: 2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
    h1 { color: #06b6d4; margin-top: 0; }
    label { display: block; font-size: 0.85rem; margin-top: 1rem; margin-bottom: 0.35rem; color: #94a3b8; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 0.65rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: #0f172a; color: #fff; font-size: 0.95rem; }
    button { margin-top: 1.5rem; width: 100%; padding: 0.75rem; border-radius: 6px; border: none; background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; }
    #form-error-banner { background: rgba(244,63,94,0.15); border: 1px solid rgba(244,63,94,0.3); color: #fecdd3; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Submit Expense Claim</h1>
    ${errorMsg ? `<div id="form-error-banner">${errorMsg}</div>` : `<div id="form-error-banner" style="display:none"></div>`}
    <form id="claim-form" method="POST" action="/claims/new">
      <label for="employee">Employee</label>
      <input name="employee" id="employee" type="text" value="${values.employee || 'Priya Sharma'}" required />
      
      <label for="date">Date</label>
      <input name="date" id="date" type="date" value="${values.date || '2026-10-08'}" required />
      
      <label for="category">Category</label>
      <select name="category" id="category" required>
        ${catOptions}
      </select>
      
      <label for="amount_inr">Amount (INR ₹)</label>
      <input name="amount_inr" id="amount_inr" type="number" step="0.01" value="${values.amountInr || values.amount_inr || ''}" required />
      
      <label for="vendor">Vendor</label>
      <input name="vendor" id="vendor" type="text" value="${values.vendor || ''}" required />
      
      <label for="cost_center">Cost Center</label>
      <input name="cost_center" id="cost_center" type="text" value="${values.costCenter || values.cost_center || 'CC-42'}" />
      
      <label for="receipt_id">Receipt Identifier</label>
      <input name="receipt_id" id="receipt_id" type="text" value="${values.receiptId || values.receipt_id || ''}" />
      
      <label for="description">Description</label>
      <textarea name="description" id="description" rows="2">${values.description || ''}</textarea>
      
      <button type="submit" id="submit-claim-button">Submit Claim</button>
    </form>
  </div>
</body>
</html>`;
}

// GET /claims/new — empty form
router.get('/claims/new', requireAuth, (req, res) => {
  if (req.headers.accept?.includes('text/html')) {
    return res.send(renderNewClaimForm({
      employee: 'Priya Sharma',
      date: '2026-10-08',
      category: 'Meals',
      costCenter: 'CC-42',
    }));
  }

  res.json({
    employee: 'Priya Sharma',
    date: '',
    category: '',
    amountInr: '',
    vendor: '',
    costCenter: 'CC-42',
    receiptId: '',
    description: '',
    error: null,
  });
});

// POST /claims/new — validation + persistence
router.post('/claims/new', requireAuth, async (req, res) => {
  const isFormSubmit = req.headers['content-type']?.includes('application/x-www-form-urlencoded') ||
                       (req.headers.accept?.includes('text/html') && !req.xhr);

  const employee   = req.body.employee?.trim();
  const date       = req.body.date?.trim();
  const category   = req.body.category?.trim();
  const vendor     = req.body.vendor?.trim();
  const costCenter = (req.body.cost_center || req.body.costCenter)?.trim();
  const receiptId  = (req.body.receipt_id  || req.body.receiptId)?.trim() || null;
  const description = req.body.description?.trim() || '';
  const rawAmount  = req.body.amount_inr ?? req.body.amountInr;

  const returnError = (msg) => {
    if (isFormSubmit) {
      return res.status(200).send(renderNewClaimForm(req.body, msg));
    }
    return res.status(422).json({ error: msg });
  };

  // 1. Cost center required
  if (!costCenter) {
    return returnError('Cost center is required. Must be populated from employee directory.');
  }

  // 2. Positive numeric amount
  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return returnError('Amount must be a positive number.');
  }

  // 3. Date check: cannot be in the future
  if (!date) {
    return returnError('Date is required.');
  }
  const claimDate = new Date(date);
  const policyDate = getPolicyDate();
  if (claimDate > policyDate) {
    return returnError(`Claim date cannot be in the future relative to policy date (${POLICY_AS_OF_DATE}).`);
  }

  // 4. Duplicate check
  const duplicate = await ExpenseClaim.findOne({
    employee,
    date,
    category,
    amountInr: amount,
    vendor,
  });
  if (duplicate) {
    return returnError('A claim matching this employee, date, category, amount, and vendor already exists.');
  }

  // Persist
  const claim = await ExpenseClaim.create({
    employee,
    date,
    category,
    amountInr: amount,
    vendor,
    costCenter,
    receiptId,
    description,
    status: 'SUBMITTED',
  });

  if (isFormSubmit) {
    return res.redirect(`/claims/${claim._id}`);
  }

  return res.status(201).json({
    claimId: claim._id,
    id: claim._id,
    claim: claim.toObject(),
  });
});

// GET /claims/:id — single claim detail
router.get('/claims/:id', requireAuth, async (req, res) => {
  const claim = await ExpenseClaim.findById(req.params.id).lean();
  if (!claim) {
    if (req.headers.accept?.includes('text/html')) {
      return res.status(404).send('Claim not found');
    }
    return res.status(404).json({ error: 'Claim not found' });
  }

  if (req.headers.accept?.includes('text/html')) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CenterAlign - Claim #${claim._id}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0d14; color: #f8fafc; padding: 2rem; margin: 0; }
    .card { max-width: 600px; margin: 0 auto; background: #161e2e; padding: 2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
    h1 { color: #06b6d4; margin-top: 0; }
    #success-banner { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #a7f3d0; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-weight: bold; }
    .field { margin-bottom: 1rem; }
    .label { color: #94a3b8; font-size: 0.85rem; }
    .val { font-size: 1.1rem; font-weight: 600; margin-top: 0.2rem; }
    a { color: #06b6d4; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div id="success-banner">Expense claim submitted successfully!</div>
    <h1>Claim Details</h1>
    <div class="field"><div class="label">Employee</div><div class="val">${claim.employee}</div></div>
    <div class="field"><div class="label">Date</div><div class="val">${claim.date}</div></div>
    <div class="field"><div class="label">Category</div><div class="val">${claim.category}</div></div>
    <div class="field"><div class="label">Vendor</div><div class="val">${claim.vendor}</div></div>
    <div class="field"><div class="label">Amount</div><div class="val">₹${(claim.amountInr || 0).toFixed(2)}</div></div>
    <div class="field"><div class="label">Cost Center</div><div class="val">${claim.costCenter}</div></div>
    <div class="field"><div class="label">Receipt ID</div><div class="val">${claim.receiptId || 'None'}</div></div>
    <div style="margin-top: 1.5rem;">
      <a href="/claims">← Back to Claims Ledger</a>
    </div>
  </div>
</body>
</html>`);
  }

  return res.json({ claim });
});

export default router;
