import mongoose from 'mongoose';

/** AuditEntry — replaces JSONL audit_<run_id>.jsonl files */
const auditEntrySchema = new mongoose.Schema({
  runId:         { type: String, required: true, index: true },
  timestamp:     { type: Date, default: Date.now },
  type:          { type: String, required: true }, // 'tool_call' | 'system_event'
  toolName:      { type: String, default: null },
  arguments:     { type: mongoose.Schema.Types.Mixed, default: {} },
  resultSummary: { type: mongoose.Schema.Types.Mixed, default: null },
  gateDecision:  { type: String, default: 'ALLOW' },
  eventType:     { type: String, default: null },
  detail:        { type: mongoose.Schema.Types.Mixed, default: {} },
  stepIndex:     { type: Number, default: 0 },
  tokensUsed:    { type: Number, default: 0 },
  costUsd:       { type: Number, default: 0 },
  prevHash:      { type: String, required: true },
  hash:          { type: String, required: true },
});

export default mongoose.model('AuditEntry', auditEntrySchema);
