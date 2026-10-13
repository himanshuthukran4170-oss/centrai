/**
 * policyChecker.test.js — Unit tests for PolicyChecker P1-P11 rules & 12 canonical claims
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClaimExtractor } from '../server/src/agent/claimExtractor.js';
import {
  checkClaim,
  checkRuleP1Receipt,
  checkRuleP2MealLimit,
  checkRuleP3CabLimit,
  checkRuleP4FlightPreapproval,
  checkRuleP5LodgingLimit,
  checkRuleP6Software,
  checkRuleP7ClientEntertainment,
  checkRuleP8StaleDate,
  checkRuleP9Alcohol,
  checkRuleP11Duplicate,
} from '../server/src/agent/policyChecker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PolicyChecker Rules', () => {
  let inboxEmails;
  let extractedClaims;

  beforeAll(() => {
    const inboxPath = path.resolve(__dirname, '../company_context/inbox_export.json');
    inboxEmails = JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));
    const extractor = new ClaimExtractor();
    extractedClaims = extractor.extractAll();
  });

  test('Rule P1: Receipt requirement over 500', () => {
    const cPass = {
      claimId: '1', employee: 'Priya', date: '2026-10-08',
      category: 'Meals', amountInr: 400.0, vendor: 'Cafe', hasReceipt: false, receiptId: null
    };
    expect(checkRuleP1Receipt(cPass).fired).toBe(false);

    const cFail = {
      claimId: '2', employee: 'Priya', date: '2026-10-08',
      category: 'Meals', amountInr: 1800.0, vendor: 'Cafe', hasReceipt: false, receiptId: null
    };
    const r = checkRuleP1Receipt(cFail);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P1');
    expect(r.verdictContribution).toBe('REJECT');
  });

  test('Rule P2: Meal daily allowance aggregation', () => {
    const c1 = { claimId: '1', employee: 'Priya', date: '2026-10-08', category: 'Meals', amountInr: 850.0, vendor: 'Cafe A' };
    const c2 = { claimId: '2', employee: 'Priya', date: '2026-10-08', category: 'Meals', amountInr: 850.0, vendor: 'Cafe B' };
    const r = checkRuleP2MealLimit(c1, [c1, c2]);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P2');
    expect(r.verdictContribution).toBe('REJECT');
  });

  test('Rule P3: Ground transportation cab limit', () => {
    const cPass = { claimId: '1', employee: 'Priya', date: '2026-10-03', category: 'Cab', amountInr: 1200.0, vendor: 'Uber' };
    expect(checkRuleP3CabLimit(cPass).fired).toBe(false);

    const cFail = { claimId: '2', employee: 'Priya', date: '2026-10-03', category: 'Cab', amountInr: 3500.0, vendor: 'Uber' };
    expect(checkRuleP3CabLimit(cFail).fired).toBe(true);
  });

  test('Rule P4: Flight manager pre-approval', () => {
    const cApproved = {
      claimId: '4', employee: 'Priya Sharma', date: '2026-09-23', category: 'Flight',
      amountInr: 18500.0, vendor: 'IndiGo', inboxRef: 'MSG-001'
    };
    expect(checkRuleP4FlightPreapproval(cApproved, inboxEmails).fired).toBe(false);

    const cUnapproved = {
      claimId: '5', employee: 'Priya Sharma', date: '2026-09-18', category: 'Flight',
      amountInr: 18500.0, vendor: 'Air India', inboxRef: null
    };
    const r = checkRuleP4FlightPreapproval(cUnapproved, inboxEmails);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P4');
    expect(r.verdictContribution).toBe('NEEDS_APPROVAL');
  });

  test('Rule P5: Lodging limit', () => {
    const cPass = { claimId: '6', employee: 'Priya', date: '2026-09-13', category: 'Lodging', amountInr: 5500.0, vendor: 'Hotel' };
    expect(checkRuleP5LodgingLimit(cPass).fired).toBe(false);

    const cFail = { claimId: '6', employee: 'Priya', date: '2026-09-13', category: 'Lodging', amountInr: 6500.0, vendor: 'Hotel' };
    expect(checkRuleP5LodgingLimit(cFail).fired).toBe(true);
  });

  test('Rule P6: Software IT approval over 5000', () => {
    const cPass = { claimId: '7', employee: 'Priya', date: '2026-09-08', category: 'Software', amountInr: 4000.0, vendor: 'SaaS' };
    expect(checkRuleP6Software(cPass).fired).toBe(false);

    const cFail = { claimId: '7', employee: 'Priya', date: '2026-09-08', category: 'Software', amountInr: 7200.0, vendor: 'JetBrains' };
    expect(checkRuleP6Software(cFail).fired).toBe(true);
  });

  test('Rule P7: Client entertainment requires manager approval', () => {
    const c = { claimId: '12', employee: 'Priya', date: '2026-08-24', category: 'Client entertainment', amountInr: 2800.0, vendor: 'Pavilion' };
    const r = checkRuleP7ClientEntertainment(c);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P7');
    expect(r.verdictContribution).toBe('NEEDS_APPROVAL');
  });

  test('Rule P8: Stale date over 90 days', () => {
    // 2026-06-15 is 120 days old from fixed date 2026-10-13
    const cOld = { claimId: '9', employee: 'Priya', date: '2026-06-15', category: 'Other', amountInr: 3000.0, vendor: 'Cowork' };
    const r = checkRuleP8StaleDate(cOld);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P8');
    expect(r.verdictContribution).toBe('REJECT');

    const cRecent = { claimId: '1', employee: 'Priya', date: '2026-10-08', category: 'Other', amountInr: 3000.0, vendor: 'Cowork' };
    expect(checkRuleP8StaleDate(cRecent).fired).toBe(false);
  });

  test('Rule P9: Alcohol is non-reimbursable', () => {
    const cClean = { claimId: '1', employee: 'Priya', date: '2026-08-29', category: 'Meals', amountInr: 1300.0, vendor: 'Grill', notes: 'dinner', receiptText: 'Steak 750' };
    expect(checkRuleP9Alcohol(cClean).fired).toBe(false);

    const cAlcohol = { claimId: '11', employee: 'Priya', date: '2026-08-29', category: 'Meals', amountInr: 1300.0, vendor: 'Grill', notes: 'dinner', receiptText: 'Beer (Alcohol beverage) 550' };
    const r = checkRuleP9Alcohol(cAlcohol);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P9');
    expect(r.verdictContribution).toBe('REJECT');
  });

  test('Rule P11: Duplicate claim detection', () => {
    const c1 = { claimId: '1', employee: 'Priya', date: '2026-10-08', category: 'Meals', amountInr: 850.0, vendor: 'Main St' };
    const c10 = { claimId: '10', employee: 'Priya', date: '2026-10-08', category: 'Meals', amountInr: 850.0, vendor: 'Main St' };
    const r = checkRuleP11Duplicate(c10, [c1, c10]);
    expect(r.fired).toBe(true);
    expect(r.clause).toBe('P11');
    expect(r.verdictContribution).toBe('REJECT');
  });

  test('Canonical 12-claim verdict table matches roadmap exactly', () => {
    const verdicts = {};
    for (const c of extractedClaims) {
      const v = checkClaim(c, extractedClaims, inboxEmails);
      verdicts[String(c.claimId)] = v;
    }

    expect(verdicts['1'].verdict).toBe('ALLOW');
    expect(verdicts['1'].clausesTriggered).toEqual([]);

    expect(verdicts['2'].verdict).toBe('ALLOW');
    expect(verdicts['2'].clausesTriggered).toEqual([]);

    expect(verdicts['3'].verdict).toBe('REJECT');
    expect(verdicts['3'].clausesTriggered).toEqual(['P2']);

    expect(verdicts['4'].verdict).toBe('NEEDS_APPROVAL');
    expect(verdicts['4'].clausesTriggered).toEqual(['P10']);

    expect(verdicts['5'].verdict).toBe('NEEDS_APPROVAL');
    expect(verdicts['5'].clausesTriggered.sort()).toEqual(['P10', 'P4']);

    expect(verdicts['6'].verdict).toBe('ALLOW');
    expect(verdicts['6'].clausesTriggered).toEqual([]);

    expect(verdicts['7'].verdict).toBe('NEEDS_APPROVAL');
    expect(verdicts['7'].clausesTriggered).toEqual(['P6']);

    expect(verdicts['8'].verdict).toBe('REJECT');
    expect(verdicts['8'].clausesTriggered).toEqual(['P1']);

    expect(verdicts['9'].verdict).toBe('REJECT');
    expect(verdicts['9'].clausesTriggered).toEqual(['P8']);

    expect(verdicts['10'].verdict).toBe('REJECT');
    expect(verdicts['10'].clausesTriggered).toEqual(['P11']);

    expect(verdicts['11'].verdict).toBe('REJECT');
    expect(verdicts['11'].clausesTriggered).toEqual(['P9']);

    expect(verdicts['12'].verdict).toBe('NEEDS_APPROVAL');
    expect(verdicts['12'].clausesTriggered).toEqual(['P7']);

    // Tally verification: exactly 3 ALLOW, 4 NEEDS_APPROVAL, 5 REJECT
    const tally = { ALLOW: 0, NEEDS_APPROVAL: 0, REJECT: 0 };
    for (const v of Object.values(verdicts)) {
      tally[v.verdict] = (tally[v.verdict] || 0) + 1;
    }

    expect(tally).toEqual({ ALLOW: 3, NEEDS_APPROVAL: 4, REJECT: 5 });
  });
});
