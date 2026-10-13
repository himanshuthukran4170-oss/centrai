/**
 * orchestrator.js — Full Autonomous Company Operator Orchestrator
 * Replaces Python agent/orchestrator.py
 */
import os from 'os';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

import { AuditLogger } from './auditLog.js';
import { ClaimExtractor } from './claimExtractor.js';
import { searchCompanyContext } from './contextLayer.js';
import { emit } from './eventBus.js';
import { GuardrailGate } from './guardrail.js';
import { HumanApprovalFlow } from './humanApproval.js';
import { checkClaim } from './policyChecker.js';
import { generateReport } from './reportGenerator.js';
import { StateManager } from './stateManager.js';
import {
  BrowserSession,
  browserClick,
  browserOpen,
  browserScreenshot,
  browserSelect,
  browserType,
} from './tools/browserTools.js';
import { verifyRun } from './verifier.js';

const MODEL_NAME = process.env.MODEL_NAME || 'claude-sonnet-4-5';
const MAX_STEPS = 300;
const MAX_COST_USD = parseFloat(process.env.MAX_RUN_COST_USD || '2.00');

export class AgentOrchestrator {
  constructor(runId, goal = "Process Priya Sharma's Q3 expense claims") {
    this.runId = runId;
    this.goal = goal;
    this.state = {
      runId,
      goal,
      expandedRequirements: [],
      plan: [],
      claims: [],
      pendingApprovals: [],
      stepIndex: 0,
      tokensUsed: 0,
      totalCostUsd: 0.0,
      lastError: null,
    };
    this.audit = new AuditLogger(runId);
    this.guardrail = new GuardrailGate('Priya Sharma');
    this.approvalFlow = new HumanApprovalFlow(runId, 500, 1.5);
    this.browserSession = BrowserSession.getInstance();
    this.browserSession.setRunId(runId);
    this.financeUrl = process.env.FINANCE_APP_URL || 'http://localhost:8000';
  }

  async init() {
    await StateManager.create(this.runId, this.goal).catch(() => {});
  }

  async saveState() {
    await StateManager.save(this.state).catch((err) => {
      console.warn('[Orchestrator] Warning: could not persist state to DB:', err.message);
    });
  }

  async planGoal() {
    const passages = searchCompanyContext('expense claim submission policy receipts thresholds');
    const contextSummary = passages
      .map((p) => `- [${p.sourceFile}] ${p.sectionHeading}: ${p.text.substring(0, 150)}...`)
      .join('\n');

    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (apiKey && !apiKey.startsWith('your_')) {
      try {
        const client = new Anthropic({ apiKey });
        const prompt = `You are an autonomous finance operator.
Goal: ${this.goal}

Available company context:
${contextSummary}

Produce:
1. Bulleted list of expanded requirements citing relevant policy clauses (e.g. P1, P2, P10).
2. Ordered list of plan steps to process the claims.

Respond in JSON format:
{
  "expanded_requirements": ["req1", "req2"],
  "plan": ["step 1", "step 2", "step 3"]
}
`;
        const response = await client.messages.create({
          model: MODEL_NAME,
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        });

        const rawText = response.content[0].text;
        const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
        const cost =
          (response.usage?.input_tokens || 0) * 0.000003 +
          (response.usage?.output_tokens || 0) * 0.000015;

        this.state.tokensUsed += tokens;
        this.state.totalCostUsd += cost;

        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}') + 1;
        const parsed = JSON.parse(rawText.substring(start, end));

        this.state.expandedRequirements = parsed.expanded_requirements || [];
        const stepsRaw = parsed.plan || [];
        this.state.plan = stepsRaw.map((desc, idx) => ({
          id: idx + 1,
          description: desc,
          status: 'PENDING',
        }));
      } catch {
        this._fallbackPlan();
      }
    } else {
      this._fallbackPlan();
    }

    await this.saveState();

    await emit(this.runId, 'plan_created', {
      goal: this.goal,
      requirements: this.state.expandedRequirements,
      plan: this.state.plan,
    });

    await this.audit.logEvent('plan_created', {
      requirements: this.state.expandedRequirements,
      steps: this.state.plan.length,
    });
  }

  _fallbackPlan() {
    this.state.expandedRequirements = [
      'Verify all claims > ₹500 have receipts per clause P1',
      'Enforce daily meal allowance limit of ₹1,500 per clause P2',
      'Validate ground transportation limit of ₹3,000 per clause P3',
      'Verify manager written pre-approval for flights per clause P4',
      'Require explicit human gate for any claim > ₹10,000 per clause P10',
      'Ensure cost center is populated correctly from employee directory (CC-42)',
    ];
    this.state.plan = [
      { id: 1, description: 'Authenticate into Finance Portal as operator', status: 'PENDING' },
      { id: 2, description: 'Extract claim records and receipt attachments from claims dataset', status: 'PENDING' },
      { id: 3, description: 'Verify claims against corporate policy rules P1-P11', status: 'PENDING' },
      { id: 4, description: 'Submit compliant claims via Finance App web interface', status: 'PENDING' },
      { id: 5, description: 'Request human approval for gated claims', status: 'PENDING' },
      { id: 6, description: 'Generate final execution verification report', status: 'PENDING' },
    ];
  }

  async ensureAuthenticated() {
    const page = await this.browserSession.ensurePage();
    const currentUrl = page.url();
    const usernameCount = await page.locator("input[name='username']").count();

    if (currentUrl.includes('/login') || usernameCount > 0 || currentUrl === 'about:blank') {
      await emit(this.runId, 'session_expired', { action: 'reauthenticating' });
      await browserOpen(`${this.financeUrl}/login`);
      await browserType('username', 'operator');
      await browserType('password', 'password');
      await browserClick('Log In');

      try {
        await page.waitForURL('**/dashboard', { timeout: 5000 });
      } catch {
        await page.waitForLoadState('networkidle').catch(() => {});
      }
    }
  }

  async checkClaimExistsInUI(claim) {
    await this.ensureAuthenticated();
    const page = await this.browserSession.ensurePage();
    await page.goto(`${this.financeUrl}/claims`);

    try {
      await page.waitForSelector('#claims-table, table', { timeout: 5000 });
    } catch {
      return false;
    }

    const content = await page.content();
    const amountStr = parseFloat(claim.amountInr || claim.amount_inr).toFixed(2);

    return (
      content.includes(claim.employee) &&
      content.includes(claim.date) &&
      content.includes(claim.vendor) &&
      content.includes(amountStr)
    );
  }

  async submitClaimWithRecovery(claim, retries = 3) {
    const page = await this.browserSession.ensurePage();
    await this.ensureAuthenticated();

    if (await this.checkClaimExistsInUI(claim)) {
      return true;
    }

    const claimId = claim.claimId || claim.claim_id || claim.id;
    const amountInr = parseFloat(claim.amountInr || claim.amount_inr);

    for (let attempt = 0; attempt < retries; attempt++) {
      // Guardrail check
      const action = {
        toolName: 'submit_claim',
        arguments: { claim_id: claimId, amount_inr: amountInr, employee: claim.employee },
      };
      const decision = this.guardrail.evaluateAction(action, claim, this.state);

      if (decision.verdict === 'FORBIDDEN') {
        await this.audit.logToolCall(
          'submit_claim',
          { claim_id: claimId },
          decision.reason,
          'FORBIDDEN'
        );
        return false;
      }

      await browserOpen(`${this.financeUrl}/claims/new`);
      await this.ensureAuthenticated();

      try {
        await page.waitForSelector('#claim-form, form', { timeout: 5000 });
      } catch {
        await this.ensureAuthenticated();
        await browserOpen(`${this.financeUrl}/claims/new`);
      }

      await browserType('employee', claim.employee);
      await browserType('date', claim.date);
      await browserSelect('category', claim.category);
      await browserType('amount_inr', amountInr.toFixed(2));
      await browserType('vendor', claim.vendor);
      await browserType('cost_center', claim.costCenter || claim.cost_center || 'CC-42');
      await browserType('receipt_id', claim.receiptId || claim.receipt_id || `REC-${claimId}`);
      await browserType('description', claim.notes || claim.description || '');

      await browserScreenshot(`claim_${claimId}_attempt_${attempt + 1}`);
      await browserClick('#submit-claim-button, button[type="submit"]');

      await page.waitForTimeout(1000).catch(() => {});

      const content = await page.content();

      // Check 1: 500 Internal Server Error recovery
      if (content.includes('500 Internal Server Error') || content.includes('Internal Server Error')) {
        await emit(this.runId, 'transient_500_detected', { claim_id: claimId, attempt: attempt + 1 });
        if (await this.checkClaimExistsInUI(claim)) {
          return true;
        }
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Check 2: Inline validation error recovery
      const errorCount = await page.locator('#form-error-banner, .error-banner').count();
      if (errorCount > 0) {
        const errText = await page.locator('#form-error-banner, .error-banner').first().innerText();
        await emit(this.runId, 'validation_error_detected', { error: errText, attempt: attempt + 1 });
        if (errText.includes('Cost center')) {
          claim.costCenter = 'CC-42';
          await browserType('cost_center', 'CC-42');
          await browserClick('#submit-claim-button, button[type="submit"]');
          await page.waitForTimeout(1000).catch(() => {});
        }
      }

      // Check 3: Success confirmation
      const url = page.url();
      const successCount = await page.locator('#success-banner, .success-banner').count();
      if (url.includes('/claims') && successCount > 0) {
        await browserScreenshot(`claim_${claimId}_success`);
        return true;
      }

      // Secondary check: verify in UI
      if (await this.checkClaimExistsInUI(claim)) {
        return true;
      }
    }

    return false;
  }

  async processAllClaims(
    autoApprovals = { '4': 'APPROVED', '12': 'APPROVED', '5': 'DENIED', '7': 'DENIED' },
    scenarioName = 's2'
  ) {
    await this.init();

    // Step 1: Planning
    await this.planGoal();

    // Step 2: Extraction & Policy evaluation
    const extractor = new ClaimExtractor();
    const allClaims = extractor.extractAll();
    const inboxEmails = extractor._loadInbox();

    for (const c of allClaims) {
      checkClaim(c, allClaims, inboxEmails);
    }

    this.state.claims = allClaims;
    await this.saveState();

    // Step 3: Authenticate
    await this.ensureAuthenticated();

    // Step 4: Process each claim
    for (const claim of allClaims) {
      const cid = String(claim.claimId || claim.claim_id || claim.id);
      this.state.stepIndex += 1;
      const stepIdx = this.state.stepIndex;

      await emit(this.runId, 'step_started', {
        step: stepIdx,
        claim_id: cid,
        vendor: claim.vendor,
        verdict: claim.verdict,
      });

      if (claim.verdict === 'ALLOW') {
        const success = await this.submitClaimWithRecovery(claim);
        await this.audit.logToolCall(
          'submit_claim',
          { claim_id: cid, amount_inr: claim.amountInr },
          { filed: success },
          'ALLOW',
          stepIdx
        );
        await emit(this.runId, 'step_completed', { claim_id: cid, filed: success });
      } else if (claim.verdict === 'NEEDS_APPROVAL') {
        const decisionChoice = autoApprovals ? autoApprovals[cid] : null;
        const decision = await this.approvalFlow.requestApproval(
          claim,
          `Policy rules triggered: ${(claim.clausesTriggered || []).join(', ')}`,
          this.state,
          decisionChoice
        );

        if (decision.decision === 'APPROVED') {
          claim.humanApproved = true;
          const success = await this.submitClaimWithRecovery(claim);
          await this.audit.logToolCall(
            'submit_claim_approved',
            { claim_id: cid, amount_inr: claim.amountInr },
            { filed: success, decision: 'APPROVED' },
            'ALLOW',
            stepIdx
          );
          await emit(this.runId, 'step_completed', {
            claim_id: cid,
            filed: success,
            status: 'APPROVED',
          });
        } else {
          await this.audit.logToolCall(
            'approval_denied',
            { claim_id: cid },
            { filed: false, decision: 'DENIED' },
            'NEEDS_APPROVAL',
            stepIdx
          );
          await emit(this.runId, 'step_completed', {
            claim_id: cid,
            filed: false,
            status: 'DENIED',
          });
        }
      } else if (claim.verdict === 'REJECT') {
        await this.audit.logToolCall(
          'reject_claim_skipped',
          { claim_id: cid, clauses: claim.clausesTriggered },
          'Claim rejected by policy; submission blocked by guardrail.',
          'FORBIDDEN',
          stepIdx
        );
        await emit(this.runId, 'step_completed', {
          claim_id: cid,
          filed: false,
          status: 'REJECTED',
        });
      }
    }

    await this.saveState();

    // Step 5: Independent Verification
    const verification = await verifyRun(scenarioName, this.runId, this.financeUrl);

    // Step 6: Generate Final Markdown Report
    generateReport(this.state, verification);
    generateReport(this.state, verification, path.resolve('reports/sample_run_report.md'));

    return verification;
  }
}

export default AgentOrchestrator;
