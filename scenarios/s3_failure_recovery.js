/**
 * s3_failure_recovery.js — Scenario 3: Failure Injection & Idempotent Recovery
 */
import crypto from 'crypto';
import { AgentOrchestrator } from '../server/src/agent/orchestrator.js';
import { resetInjections } from '../server/src/middleware/injection.middleware.js';
import { seedDatabase } from '../server/src/seed/seed.js';

export async function runS3() {
  console.log('='.repeat(60));
  console.log('RUNNING SCENARIO 3: FAILURE INJECTION & RECOVERY');
  console.log('='.repeat(60));

  process.env.INJECT_TRANSIENT_500 = '1';
  process.env.INJECT_VALIDATION_ERROR = '1';
  process.env.INJECT_SLOW_PAGE = '1';
  process.env.INJECT_SESSION_EXPIRY = '1';
  process.env.SESSION_TTL_SECONDS = '5';

  await seedDatabase(true);
  resetInjections();

  const runId = `s3_${crypto.randomBytes(4).toString('hex')}`;
  const orchestrator = new AgentOrchestrator(runId, "Process Priya Sharma's Q3 claims under failure injection");

  const report = await orchestrator.processAllClaims({}, 's3');

  console.log(`\nScenario 3 Completed. Verification Verdict: ${report.overallResult}`);
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

  console.log('ALL SCENARIO 3 FAILURE RECOVERY CHECKS PASSED!');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('s3_failure_recovery.js')) {
  runS3().catch((err) => {
    console.error('Scenario 3 Error:', err);
    process.exit(1);
  });
}
