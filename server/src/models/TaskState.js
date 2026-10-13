import mongoose from 'mongoose';

/** TaskState — replaces state_<run_id>.json files (agent/state.py) */
const planStepSchema = new mongoose.Schema({
  id:          Number,
  description: String,
  status:      { type: String, default: 'PENDING' },
  error:       { type: String, default: null },
}, { _id: false });

const claimRecordSchema = new mongoose.Schema({
  claimId:          String,
  employee:         String,
  date:             String,
  category:         String,
  amountInr:        Number,
  vendor:           String,
  receiptFile:      String,
  notes:            { type: String, default: '' },
  costCenter:       { type: String, default: 'CC-42' },
  receiptId:        { type: String, default: null },
  receiptText:      { type: String, default: '' },
  verdict:          { type: String, default: 'PENDING' },
  clausesTriggered: { type: [String], default: [] },
  humanApproved:    { type: Boolean, default: false },
  filedClaimId:     { type: String, default: null },
  filingError:      { type: String, default: null },
}, { _id: false });

const approvalRequestSchema = new mongoose.Schema({
  claimId:         String,
  employee:        String,
  amountInr:       Number,
  reason:          String,
  clauses:         [String],
  evidenceSummary: String,
  status:          { type: String, default: 'PENDING' },
}, { _id: false });

const taskStateSchema = new mongoose.Schema({
  runId:                { type: String, required: true, unique: true, index: true },
  goal:                 { type: String, required: true },
  expandedRequirements: { type: [String], default: [] },
  plan:                 { type: [planStepSchema], default: [] },
  claims:               { type: [claimRecordSchema], default: [] },
  pendingApprovals:     { type: [approvalRequestSchema], default: [] },
  evidence:             { type: mongoose.Schema.Types.Mixed, default: {} },
  stepIndex:            { type: Number, default: 0 },
  retryCounts:          { type: mongoose.Schema.Types.Mixed, default: {} },
  tokensUsed:           { type: Number, default: 0 },
  totalCostUsd:         { type: Number, default: 0 },
  lastError:            { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('TaskState', taskStateSchema);
