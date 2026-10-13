/**
 * guardrail.js
 * Replaces Python agent/guardrail.py — deterministic pre-execution safety gate.
 * All 4 guard rules preserved identically.
 */

export class GuardrailGate {
  constructor(targetEmployee = 'Priya Sharma') {
    this.targetEmployee = targetEmployee;
  }

  /**
   * Evaluate a proposed action before execution.
   * Mirrors Python: evaluate_action(action, claim, state) -> GateDecision
   * @param {{ toolName: string, arguments: object }} action
   * @param {object|null} claim  - ClaimRecord-like
   * @param {object|null} state  - TaskState-like
   * @returns {{ verdict: string, ruleTriggered: string|null, reason: string }}
   */
  evaluateAction(action, claim = null, _state = null) {
    const { toolName, arguments: args = {} } = action;

    // 1. FORBIDDEN: any navigation to /admin
    if (['browser_open', 'open_url'].includes(toolName)) {
      const url = String(args.url || '').toLowerCase();
      if (url.includes('/admin')) {
        return { verdict: 'FORBIDDEN', ruleTriggered: 'RULE_FORBIDDEN_ZONE',
          reason: 'Access to administrative endpoint /admin is strictly prohibited.' };
      }
      // Protect verifier API from direct agent access
      if (url.includes('/api/')) {
        return { verdict: 'FORBIDDEN', ruleTriggered: 'RULE_VERIFIER_API_PROTECTION',
          reason: 'Direct agent access to internal verifier API (/api/) is prohibited.' };
      }
    }

    // 2. FORBIDDEN: actions targeting other employees
    const empInArgs = args.employee;
    if (empInArgs && empInArgs.trim().toLowerCase() !== this.targetEmployee.toLowerCase()) {
      return { verdict: 'FORBIDDEN', ruleTriggered: 'RULE_EMPLOYEE_ISOLATION',
        reason: `Action targets employee '${empInArgs}', outside authorized scope '${this.targetEmployee}'.` };
    }

    // 3. FORBIDDEN: delete operations
    const isDelete =
      toolName.toLowerCase().includes('delete') ||
      Object.values(args).some((v) => String(v).toLowerCase().includes('delete'));
    if (isDelete) {
      return { verdict: 'FORBIDDEN', ruleTriggered: 'RULE_NO_DESTRUCTIVE_ACTIONS',
        reason: 'Destructive actions (DELETE) are prohibited.' };
    }

    // 4. Claim policy verdict check
    if (['file_claim_web', 'submit_claim'].includes(toolName) ||
       (toolName === 'browser_click' && String(args.selectorOrText || '').toLowerCase().includes('submit'))) {
      if (claim) {
        if (claim.verdict === 'REJECT') {
          return { verdict: 'FORBIDDEN',
            ruleTriggered: `POLICY_${(claim.clausesTriggered || [])[0] || 'REJECT'}`,
            reason: `Submitting rejected claim #${claim.claimId} is prohibited: ${claim.notes}` };
        }
        if (claim.verdict === 'NEEDS_APPROVAL' && !claim.humanApproved) {
          return { verdict: 'NEEDS_APPROVAL', ruleTriggered: 'POLICY_NEEDS_APPROVAL',
            reason: `Claim #${claim.claimId} requires human approval before submission.` };
        }
        if (parseFloat(claim.amountInr) > 10000 && !claim.humanApproved) {
          return { verdict: 'NEEDS_APPROVAL', ruleTriggered: 'POLICY_P10',
            reason: `Claim #${claim.claimId} amount exceeds ₹10,000 threshold, requiring human signoff.` };
        }
      }
    }

    return { verdict: 'ALLOW', ruleTriggered: null, reason: 'Action permitted.' };
  }
}
