import mongoose from 'mongoose';

/** AgentEvent — replaces SQLite events_<run_id>.db rows */
const agentEventSchema = new mongoose.Schema({
  runId:     { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  type:      { type: String, required: true, index: true },
  payload:   { type: mongoose.Schema.Types.Mixed, default: {} },
});

export default mongoose.model('AgentEvent', agentEventSchema);
