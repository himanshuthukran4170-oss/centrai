/**
 * s2_full_mixed.js — Scenario 2: Full Mixed 12 Claims with Human Approvals
 */
import crypto from 'crypto';
import { AgentOrchestrator } from '../server/src/agent/orchestrator.js';
import { seedDatabase } from '../server/src/seed/seed.js';

export async function runS2() {
  console.log('='.repeat(60));
  console.log('RUNNING SCENARIO 2: FULL MIXED 12 CLAIMS');
  console.log('='.repeat(60));

  await seedDatabase(true);

  const runId = `s2_${crypto.randomBytes(4).toString('hex')}`;
  const orchestrator = new AgentOrchestrator(runId, "Process Priya Sharma's Q3 mixed expense claims");

  // In S2: Approve claims 4 & 12; Deny claims 5 & 7
  const approvals = {
    '4': 'APPROVED',
    '12': 'APPROVED',
    '5': 'DENIED',
    '7': 'DENIED',
  };

  const report = await orchestrator.processAllClaims(approvals, 's2');

  console.log(`\nScenario 2 Completed. Verification Verdict: ${report.overallResult}`);
  console.log(`Passed: ${report.passCount} | Failed: ${report.failCount}`);

  if (report.overallResult !== 'PASS') {
    console.error('VERIFICATION FAILED!');
    for (const r of report.results || []) {
      if (r.result === 'FAIL') {
        console.error(`  - Claim ${r.claimId}: ${r.details}`);
      }
    }
    process.exit(1);
  }

  console.log('ALL SCENARIO 2 CHECKS PASSED!');
  process.exit(0);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('s2_full_mixed.js')) {
  runS2().catch((err) => {
    console.error('Scenario 2 Error:', err);
    process.exit(1);
  });
}
