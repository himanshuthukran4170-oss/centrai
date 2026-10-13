/**
 * humanApproval.js — Human approval workflow manager with IPC polling and CLI fallback
 * Replaces Python agent/human_approval.py
 */
import { emit, pollEvents } from './eventBus.js';

export class ApprovalDecision {
  constructor({ claimId, decision, note = '' }) {
    this.claimId = claimId;
    this.decision = decision; // APPROVED, DENIED, DEFERRED
    this.note = note;
  }
}

export class HumanApprovalFlow {
  constructor(runId, pollIntervalMs = 500, timeoutSeconds = 10.0) {
    this.runId = runId;
    this.pollIntervalMs = pollIntervalMs;
    this.timeoutSeconds = timeoutSeconds;
  }

  async requestApproval(claim, reason, state = null, autoDecision = null) {
    const claimId = claim.claimId || claim.claim_id || claim.id;
    const req = {
      claimId,
      employee: claim.employee,
      amountInr: claim.amountInr || claim.amount_inr,
      reason,
      clauses: claim.clausesTriggered || claim.clauses_triggered || [],
      evidenceSummary: `Vendor: ${claim.vendor}, Date: ${claim.date}, Receipt: ${claim.receiptFile || claim.receipt_file}`,
      status: 'PENDING',
    };

    if (state) {
      if (!state.pendingApprovals) state.pendingApprovals = [];
      state.pendingApprovals.push(req);
      if (typeof state.save === 'function') {
        await state.save();
      }
    }

    // Emit approval_requested event for UI dashboard
    const lastEventId = await emit(
      this.runId,
      'approval_requested',
      {
        claim_id: claimId,
        employee: claim.employee,
        amount_inr: claim.amountInr || claim.amount_inr,
        reason,
        clauses: claim.clausesTriggered || claim.clauses_triggered || [],
        vendor: claim.vendor,
        date: claim.date,
      }
    );

    // If automated test decision provided (e.g. S2 harness or test scenario)
    if (autoDecision) {
      const decision = String(autoDecision).toUpperCase();
      await emit(
        this.runId,
        'approval_response',
        { claim_id: claimId, decision, note: 'Auto harness response' }
      );
      req.status = decision;
      if (decision === 'APPROVED') {
        claim.humanApproved = true;
        claim.human_approved = true;
      }
      return new ApprovalDecision({
        claimId,
        decision,
        note: 'Automated test response',
      });
    }

    // Poll for response event from UI
    const startTime = Date.now();
    const timeoutMs = this.timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const newEvents = await pollEvents(this.runId, lastEventId, 'approval_response');
      for (const ev of newEvents) {
        const payload = ev.payload || {};
        if (String(payload.claim_id) === String(claimId)) {
          const decision = String(payload.decision || 'DENIED').toUpperCase();
          req.status = decision;
          if (decision === 'APPROVED') {
            claim.humanApproved = true;
            claim.human_approved = true;
          }
          return new ApprovalDecision({
            claimId,
            decision,
            note: payload.note || 'Decided via UI',
          });
        }
      }
      await new Promise(res => setTimeout(res, this.pollIntervalMs));
    }

    // Timeout reached: mark as DEFERRED
    req.status = 'DEFERRED';
    return new ApprovalDecision({
      claimId,
      decision: 'DEFERRED',
      note: 'Approval request timed out without response.',
    });
  }
}

export default HumanApprovalFlow;
