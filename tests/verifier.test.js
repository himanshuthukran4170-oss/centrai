/**
 * verifier.test.js — Unit tests for Independent Verifier
 */
import axios from 'axios';
import { Verifier } from '../server/src/agent/verifier.js';

describe('Independent Verifier', () => {
  let verifier;

  beforeEach(() => {
    verifier = new Verifier('http://localhost:8000');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('passes S1 when claims 1, 2, 6 are present and compliant', async () => {
    const mockClaims = [
      { id: '1', employee: 'Priya Sharma', date: '2026-10-08', category: 'Meals', amount_inr: 850.0, vendor: 'Main Street Cafe' },
      { id: '2', employee: 'Priya Sharma', date: '2026-10-03', category: 'Cab', amount_inr: 1200.0, vendor: 'Uber India' },
      { id: '6', employee: 'Priya Sharma', date: '2026-09-13', category: 'Lodging', amount_inr: 5500.0, vendor: 'Lemon Tree Hotel' },
    ];

    jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: mockClaims,
    });

    const report = await verifier.verifyScenario('s1', 'test_run_s1');
    expect(report.overallResult).toBe('PASS');
    expect(report.failCount).toBe(0);
    expect(report.passCount).toBe(12);
  });

  test('detects missing claim and reports FAIL', async () => {
    // Only claim 1 and 2, missing claim 6
    const mockClaims = [
      { id: '1', employee: 'Priya Sharma', date: '2026-10-08', category: 'Meals', amount_inr: 850.0, vendor: 'Main Street Cafe' },
      { id: '2', employee: 'Priya Sharma', date: '2026-10-03', category: 'Cab', amount_inr: 1200.0, vendor: 'Uber India' },
    ];

    jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: mockClaims,
    });

    const report = await verifier.verifyScenario('s1', 'test_run_missing');
    expect(report.overallResult).toBe('FAIL');
    expect(report.failCount).toBeGreaterThanOrEqual(1);

    const failed = report.results.filter((r) => r.result === 'FAIL').map((r) => r.claimId);
    expect(failed).toContain('6');
  });

  test('detects corrupted data and reports FAIL', async () => {
    // Claim 1 has amount 9999 instead of 850
    const mockClaims = [
      { id: '1', employee: 'Priya Sharma', date: '2026-10-08', category: 'Meals', amount_inr: 9999.0, vendor: 'Main Street Cafe' },
      { id: '2', employee: 'Priya Sharma', date: '2026-10-03', category: 'Cab', amount_inr: 1200.0, vendor: 'Uber India' },
      { id: '6', employee: 'Priya Sharma', date: '2026-09-13', category: 'Lodging', amount_inr: 5500.0, vendor: 'Lemon Tree Hotel' },
    ];

    jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: mockClaims,
    });

    const report = await verifier.verifyScenario('s1', 'test_run_corrupted');
    expect(report.overallResult).toBe('FAIL');
    const failed = report.results.filter((r) => r.result === 'FAIL').map((r) => r.claimId);
    expect(failed).toContain('1');
  });
});
