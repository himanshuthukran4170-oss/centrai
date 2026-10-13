/**
 * s1_happy_path.js — Scenario 1: Happy Path (Clean ALLOW Claims)
 */
import crypto from 'crypto';
import { AgentOrchestrator } from '../server/src/agent/orchestrator.js';
import { seedDatabase } from '../server/src/seed/seed.js';

export async function runS1() {
  console.log('='.repeat(60));
  console.log('RUNNING SCENARIO 1: HAPPY PATH (CLAIMS 1, 2, 6)');
  console.log('='.repeat(60));

  // Reset database for deterministic run
  await seedDatabase(true);

  const runId = `s1_${crypto.randomBytes(4).toString('hex')}`;
  const orchestrator = new AgentOrchestrator(runId, "Process Priya Sharma's Q3 clean expense claims");

  const report = await orchestrator.processAllClaims({}, 's1');

  console.log(`\nScenario 1 Completed. Verification Verdict: ${report.overallResult}`);
  console.log(`Passed: ${report.passCount} | Failed: ${report.failCount}`);

  if (report.overallResult !== 'PASS') {
    console.error('VERIFICATION FAILED!');
    process.exit(1);
  }

  console.log('ALL SCENARIO 1 CHECKS PASSED!');
  process.exit(0);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('s1_happy_path.js')) {
  runS1().catch((err) => {
    console.error('Scenario 1 Error:', err);
    process.exit(1);
  });
}
