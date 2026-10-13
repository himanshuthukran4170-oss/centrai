import mongoose from 'mongoose';

/**
 * ExpenseClaim model — mirrors Python finance_app/models.py class ExpenseClaim
 */
const expenseClaimSchema = new mongoose.Schema({
  employee:    { type: String, required: true, index: true, trim: true },
  date:        { type: String, required: true, index: true }, // YYYY-MM-DD string (matches Python)
  category:    { type: String, required: true },
  amountInr:   { type: Number, required: true },
  currency:    { type: String, default: 'INR' },
  vendor:      { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  costCenter:  { type: String, required: true },
  receiptId:   { type: String, default: null },
  status:      { type: String, default: 'SUBMITTED' },
  createdAt:   { type: Date, default: Date.now },
});

export default mongoose.model('ExpenseClaim', expenseClaimSchema);
