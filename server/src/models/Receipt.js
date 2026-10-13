import mongoose from 'mongoose';

/** Receipt model — mirrors Python finance_app/models.py class Receipt */
const receiptSchema = new mongoose.Schema({
  claimId:  { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseClaim', default: null },
  filename: { type: String, required: true },
  content:  { type: String, default: null },
});

export default mongoose.model('Receipt', receiptSchema);
