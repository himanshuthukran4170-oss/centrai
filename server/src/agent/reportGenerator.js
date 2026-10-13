/**
 * reportGenerator.js — Executive execution and verification report generator
 * Replaces Python agent/report_generator.py
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');

export function generateReport(state, verification = null, outputPath = null) {
  const runId = state.runId || state.run_id;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const claims = state.claims || [];
  const totalClaims = claims.length;
  const passedVerifications = verification ? verification.passCount : 0;
  const failedVerifications = verification ? verification.failCount : 0;
  const overallStatus = verification ? verification.overallResult : 'UNVERIFIED';

  const lines = [
    `# CenterAlign Autonomous Operator Run Report`,
    ``,
    `**Run ID:** \`${runId}\`  `,
    `**Generated:** ${nowStr}  `,
    `**Verification Verdict:** **${overallStatus}** (${passedVerifications} Passed / ${failedVerifications} Failed)  `,
    ``,
    `---`,
    ``,
    `## 1. Executive Summary`,
    ``,
    `- **Objective:** ${state.goal}`,
    `- **Total Claims Processed:** ${totalClaims}`,
    `- **Token Usage:** ${(state.tokensUsed || 0).toLocaleString()} tokens`,
    `- **Total Estimated Cost:** $${(state.totalCostUsd || 0).toFixed(4)} USD`,
    `- **Execution Steps:** ${state.stepIndex || 0}`,
    ``,
    `---`,
    ``,
    `## 2. Policy Evaluation & Verification Results`,
    ``,
    `| # | Employee | Vendor | Amount (₹) | Policy Verdict | Clauses | Human Gate | Verifier | Details |`,
    `|---|---|---|---|---|---|---|---|---|`,
  ];

  const vResults = new Map();
  if (verification && verification.results) {
    for (const r of verification.results) {
      vResults.set(String(r.claimId), r);
    }
  }

  for (const claim of claims) {
    const cid = String(claim.claimId || claim.claim_id || claim.id);
    const clauses = claim.clausesTriggered || claim.clauses_triggered || [];
    const clausesStr = clauses.length > 0 ? clauses.join(', ') : '—';
    const humanApproved = claim.humanApproved || claim.human_approved;
    const verdict = claim.verdict || 'PENDING';
    const humanStr = humanApproved ? 'Approved' : (verdict === 'ALLOW' ? 'N/A' : 'Denied/None');

    const vRes = vResults.get(cid);
    const vStatus = vRes ? `**${vRes.result}**` : 'N/A';
    const detailsStr = vRes ? vRes.details : (claim.notes || '');

    const amountInr = parseFloat(claim.amountInr || claim.amount_inr || 0);

    lines.push(
      `| ${cid} | ${claim.employee} | ${claim.vendor} | ₹${amountInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${verdict} | ${clausesStr} | ${humanStr} | ${vStatus} | ${detailsStr} |`
    );
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 3. Security, Guardrail & Audit Summary`,
    ``,
    `- **Audit Trail:** Recorded via MongoDB chained collection & audit logs.`,
    `- **State Snapshot:** Preserved in MongoDB TaskState collection.`,
    `- **Guardrail Enforcement:** Deterministic code gate wrapped all browser and submission actions.`,
    `- **Unauthorized Endpoint Access:** Blocked with HTTP 403 / FORBIDDEN.`,
    ``,
    `---`,
    ``,
    `## 4. System Boundaries & Edge Cases Handled`,
    ``,
    `1. **P2 Daily Meal Aggregation:** Strictly isolated per calendar day.`,
    `2. **P10 Gate:** Claims exceeding ₹10,000 paused for human authorization.`,
    `3. **Idempotent Retries:** Duplicate check via browser UI prevents duplicate submissions.`,
    `4. **Independent Verifier:** Ground truth comparison verified via \`/api/claims\`.`
  );

  const reportContent = lines.join('\n');

  let outFile;
  if (outputPath) {
    outFile = path.resolve(outputPath);
  } else {
    outFile = path.join(REPO_ROOT, 'reports', `run_${runId}_report.md`);
  }

  const parentDir = path.dirname(outFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(outFile, reportContent, 'utf-8');
  return reportContent;
}

export default { generateReport };
