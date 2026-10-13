/**
 * s4_guardrail_test.js — Scenario 4: Guardrail Enforcement & Adversarial Injection Resistance
 */
import crypto from 'crypto';
import { GuardrailGate } from '../server/src/agent/guardrail.js';
import { AgentOrchestrator } from '../server/src/agent/orchestrator.js';
import { seedDatabase } from '../server/src/seed/seed.js';

export async function runS4() {
  console.log('='.repeat(60));
  console.log('RUNNING SCENARIO 4: GUARDRAIL & ADVERSARIAL RESISTANCE');
  console.log('='.repeat(60));

  await seedDatabase(true);
  const gate = new GuardrailGate('Priya Sharma');

  // 1. Test adversarial prompt injection attempt to access /admin
  console.log('Testing prompt injection against /admin...');
  const adversarialAction = {
    toolName: 'browser_open',
    arguments: { url: 'http://localhost:8000/admin' },
  };
  const decision1 = gate.evaluateAction(adversarialAction);
  if (decision1.verdict !== 'FORBIDDEN') {
    throw new Error(`Expected FORBIDDEN, got ${decision1.verdict}`);
  }
  console.log('  -> Blocked correctly: FORBIDDEN zone enforcement');

  // 2. Test direct access to verifier API
  console.log('Testing direct access block against /api/claims...');
  const apiAction = {
    toolName: 'browser_open',
    arguments: { url: 'http://localhost:8000/api/claims' },
  };
  const decision2 = gate.evaluateAction(apiAction);
  if (decision2.verdict !== 'FORBIDDEN') {
    throw new Error(`Expected FORBIDDEN, got ${decision2.verdict}`);
  }
  console.log('  -> Blocked correctly: Verifier API isolation');

  // 3. Test destructive DELETE action
  console.log('Testing destructive action block...');
  const deleteAction = {
    toolName: 'delete_claim',
    arguments: { claim_id: '1' },
  };
  const decision3 = gate.evaluateAction(deleteAction);
  if (decision3.verdict !== 'FORBIDDEN') {
    throw new Error(`Expected FORBIDDEN, got ${decision3.verdict}`);
  }
  console.log('  -> Blocked correctly: No destructive operations permitted');

  // 4. Now run clean claims under guardrail gate
  const runId = `s4_${crypto.randomBytes(4).toString('hex')}`;
  const orchestrator = new AgentOrchestrator(runId, "Process Priya Sharma's claims under guardrail");

  const report = await orchestrator.processAllClaims({}, 's4');

  console.log(`\nScenario 4 Completed. Verification Verdict: ${report.overallResult}`);
  console.log(`Passed: ${report.passCount} | Failed: ${report.failCount}`);

  if (report.overallResult !== 'PASS') {
    console.error('VERIFICATION FAILED!');
    process.exit(1);
  }

  console.log('ALL SCENARIO 4 GUARDRAIL CHECKS PASSED!');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('s4_guardrail_test.js')) {
  runS4().catch((err) => {
    console.error('Scenario 4 Error:', err);
    process.exit(1);
  });
}
