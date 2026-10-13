/**
 * claimExtractor.test.js — Unit tests for ClaimExtractor
 */
import { ClaimExtractor } from '../server/src/agent/claimExtractor.js';

describe('ClaimExtractor', () => {
  let extractor;

  beforeAll(() => {
    extractor = new ClaimExtractor();
  });

  test('extracts all 12 claims', () => {
    const claims = extractor.extractAll();
    expect(claims.length).toBe(12);
  });

  test('claim 4 has inbox approval reference', () => {
    const claims = extractor.extractAll();
    const c4 = claims.find((c) => String(c.claimId) === '4');
    expect(c4).toBeDefined();
    expect(c4.inboxRef).toBe('MSG-001');
  });

  test('claim 8 is flagged as missing receipt', () => {
    const claims = extractor.extractAll();
    const c8 = claims.find((c) => String(c.claimId) === '8');
    expect(c8).toBeDefined();
    expect(c8.hasReceipt).toBe(false);
  });

  test('claim 11 has alcohol line item', () => {
    const claims = extractor.extractAll();
    const c11 = claims.find((c) => String(c.claimId) === '11');
    expect(c11).toBeDefined();
    const text = ((c11.notes || '') + ' ' + (c11.receiptText || '')).toLowerCase();
    expect(text).toContain('alcohol');
  });

  test('claim 12 has ambiguous category flagged', () => {
    const claims = extractor.extractAll();
    const c12 = claims.find((c) => String(c.claimId) === '12');
    expect(c12).toBeDefined();
    expect(c12.categoryAmbiguous).toBe(true);
    expect(c12.category).toBe('Meals');
  });
});
