/**
 * verifier.js — Independent Verifier: validates actual finance app records against ground truth.
 * Replaces Python agent/verifier.py
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_DIR = path.resolve(__dirname, '../../../tests/expected_outcomes');

export class ClaimVerificationResult {
  constructor({ claimId, expectedFiled, actualFiled, result, details, recordId = null }) {
    this.claimId = claimId;
    this.expectedFiled = expectedFiled;
    this.actualFiled = actualFiled;
    this.result = result; // PASS, FAIL
    this.details = details;
    this.recordId = recordId;
  }
}

export class VerificationReport {
  constructor({ scenario, runId, overallResult, passCount = 0, failCount = 0, totalChecked = 0, results = [] }) {
    this.scenario = scenario;
    this.runId = runId;
    this.overallResult = overallResult; // PASS, FAIL
    this.passCount = passCount;
    this.failCount = failCount;
    this.totalChecked = totalChecked;
    this.results = results;
  }

  toObject() {
    return {
      scenario: this.scenario,
      runId: this.runId,
      overallResult: this.overallResult,
      passCount: this.passCount,
      failCount: this.failCount,
      totalChecked: this.totalChecked,
      results: this.results,
    };
  }
}

export class Verifier {
  constructor(financeUrl = 'http://localhost:8000') {
    this.financeUrl = financeUrl.replace(/\/+$/, '');
  }

  async verifyScenario(scenario, runId = 'unknown', targetEmployee = 'Priya Sharma') {
    const expectedFile = path.join(EXPECTED_DIR, `${scenario}_expected.json`);
    if (!fs.existsSync(expectedFile)) {
      throw new Error(`Expected outcome file not found: ${expectedFile}`);
    }

    const expectedList = JSON.parse(fs.readFileSync(expectedFile, 'utf-8'));

    // Call read-only verifier API via fresh clean HTTP client (no agent cookies)
    const apiUrl = `${this.financeUrl}/api/claims`;
    const response = await axios.get(apiUrl, {
      params: { employee: targetEmployee },
      timeout: 10000,
    });

    if (response.status !== 200) {
      throw new Error(`Verifier API query failed: HTTP ${response.status} ${response.statusText}`);
    }

    const actualClaims = response.data;
    const results = [];
    let passCount = 0;
    let failCount = 0;
    const matchedRecordIds = new Set();

    for (const exp of expectedList) {
      const cId = String(exp.claim_id);
      const expFiled = Boolean(exp.expected_filed);
      const expAmount = parseFloat(exp.expected_amount_inr);
      const expVendor = String(exp.expected_vendor).trim().toLowerCase();

      // Find matching actual claim by vendor, amount, excluding already matched records
      const matches = actualClaims.filter(a => {
        const aId = String(a.id || a._id);
        const aVendor = String(a.vendor || '').trim().toLowerCase();
        const aAmount = parseFloat(a.amount_inr ?? a.amountInr);
        return (
          !matchedRecordIds.has(aId) &&
          aVendor === expVendor &&
          Math.abs(aAmount - expAmount) < 0.05
        );
      });

      const actualFiled = matches.length > 0;
      const matchingRecord = matches[0] || null;

      if (expFiled) {
        if (!actualFiled) {
          results.push(
            new ClaimVerificationResult({
              claimId: cId,
              expectedFiled: true,
              actualFiled: false,
              result: 'FAIL',
              details: `Expected claim #${cId} (${exp.expected_vendor} ₹${expAmount}) was NOT filed.`,
            })
          );
          failCount++;
        } else {
          const recId = String(matchingRecord.id || matchingRecord._id);
          matchedRecordIds.add(recId);

          const errors = [];
          const actCategory = String(matchingRecord.category || '').toLowerCase();
          const expCategory = String(exp.expected_category || '').toLowerCase();
          if (actCategory !== expCategory) {
            errors.push(`Category mismatch: expected ${exp.expected_category}, got ${matchingRecord.category}`);
          }

          if (errors.length > 0) {
            results.push(
              new ClaimVerificationResult({
                claimId: cId,
                expectedFiled: true,
                actualFiled: true,
                result: 'FAIL',
                details: errors.join('; '),
                recordId: recId,
              })
            );
            failCount++;
          } else {
            results.push(
              new ClaimVerificationResult({
                claimId: cId,
                expectedFiled: true,
                actualFiled: true,
                result: 'PASS',
                details: 'Record verified matches ground truth.',
                recordId: recId,
              })
            );
            passCount++;
          }
        }
      } else {
        if (actualFiled) {
          const recId = String(matchingRecord.id || matchingRecord._id);
          results.push(
            new ClaimVerificationResult({
              claimId: cId,
              expectedFiled: false,
              actualFiled: true,
              result: 'FAIL',
              details: `Forbidden/Rejected claim #${cId} was improperly filed in database!`,
              recordId: recId,
            })
          );
          failCount++;
        } else {
          results.push(
            new ClaimVerificationResult({
              claimId: cId,
              expectedFiled: false,
              actualFiled: false,
              result: 'PASS',
              details: 'Correctly not filed in accordance with policy/gate.',
            })
          );
          passCount++;
        }
      }
    }

    const overall = failCount === 0 ? 'PASS' : 'FAIL';

    return new VerificationReport({
      scenario,
      runId,
      overallResult: overall,
      passCount,
      failCount,
      totalChecked: expectedList.length,
      results,
    });
  }
}

export async function verifyRun(scenario, runId, financeUrl = 'http://localhost:8000') {
  const verifier = new Verifier(financeUrl);
  return verifier.verifyScenario(scenario, runId);
}

export default { Verifier, verifyRun };
