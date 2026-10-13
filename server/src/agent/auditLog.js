/**
 * auditLog.js
 * Replaces Python agent/audit_log.py — cryptographically chained audit logger
 * Entries stored in MongoDB AuditEntry collection (same SHA-256 chain semantics).
 */
import crypto from 'crypto';
import AuditEntry from '../models/AuditEntry.js';

const GENESIS_HASH = 'GENESIS_000000000000000000000000000000000000000000000000000000000000';

function gatherSecrets() {
  const secrets = [];
  for (const key of ['ANTHROPIC_API_KEY', 'JWT_SECRET']) {
    const val = process.env[key];
    if (val && val.length > 4) secrets.push(val);
  }
  return secrets;
}

function redactText(text, secrets) {
  for (const s of secrets) text = text.split(s).join('[REDACTED]');
  return text;
}

function redactObj(obj, secrets) {
  if (typeof obj === 'string') return redactText(obj, secrets);
  if (Array.isArray(obj))      return obj.map((i) => redactObj(i, secrets));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, redactObj(v, secrets)]));
  }
  return obj;
}

export class AuditLogger {
  constructor(runId) {
    this.runId    = runId;
    this.lastHash = GENESIS_HASH;
    this.secrets  = gatherSecrets();
  }

  async logEntry(entry) {
    const ts = new Date().toISOString();
    entry.timestamp = ts;
    entry.runId     = this.runId;
    entry.prevHash  = this.lastHash;

    const redacted = redactObj(entry, this.secrets);

    // Sort keys for deterministic hash (mirrors Python json.dumps(sort_keys=True))
    const sorted = JSON.stringify(redacted, Object.keys(redacted).sort());
    const hash   = crypto.createHash('sha256').update(sorted).digest('hex');
    redacted.hash = hash;
    this.lastHash = hash;

    await AuditEntry.create(redacted);
    return hash;
  }

  async logToolCall(toolName, args, resultSummary, gateDecision = 'ALLOW', stepIndex = 0, tokensUsed = 0, costUsd = 0) {
    return this.logEntry({
      type:          'tool_call',
      toolName,
      arguments:     args,
      resultSummary,
      gateDecision,
      stepIndex,
      tokensUsed,
      costUsd,
    });
  }

  async logEvent(eventType, detail, stepIndex = 0) {
    return this.logEntry({
      type:      'system_event',
      eventType,
      detail,
      stepIndex,
    });
  }
}
