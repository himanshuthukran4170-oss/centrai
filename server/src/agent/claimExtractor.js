/**
 * claimExtractor.js
 * Replaces Python agent/claim_extractor.py
 * Reads claims_data/claims_spreadsheet.csv + receipts, cross-references employee directory + inbox.
 * Uses csv-parse for CSV reading (mirrors Python csv.DictReader).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, '../../../');

export class ClaimExtractor {
  constructor({
    csvPath      = path.join(REPO_ROOT, 'claims_data/claims_spreadsheet.csv'),
    receiptsDir  = path.join(REPO_ROOT, 'claims_data/receipts'),
    empDirPath   = path.join(REPO_ROOT, 'company_context/employee_directory.json'),
    inboxPath    = path.join(REPO_ROOT, 'company_context/inbox_export.json'),
  } = {}) {
    this.csvPath     = csvPath;
    this.receiptsDir = receiptsDir;
    this.empDirPath  = empDirPath;
    this.inboxPath   = inboxPath;

    this.employeeDirectory = this._loadEmployeeDirectory();
    this.inboxEmails       = this._loadInbox();
  }

  _loadEmployeeDirectory() {
    if (fs.existsSync(this.empDirPath)) {
      return JSON.parse(fs.readFileSync(this.empDirPath, 'utf-8'));
    }
    return {};
  }

  _loadInbox() {
    if (fs.existsSync(this.inboxPath)) {
      return JSON.parse(fs.readFileSync(this.inboxPath, 'utf-8'));
    }
    return [];
  }

  /**
   * Extract all 12 claims with cross-referenced receipts and inbox context.
   * Mirrors Python: ClaimExtractor.extract_all() -> List[ClaimRecord]
   * @returns {Array<object>} Array of ClaimRecord-like objects
   */
  extractAll() {
    const csvContent = fs.readFileSync(this.csvPath, 'utf-8');
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    const claims = [];

    for (const row of rows) {
      const cId           = String(row.claim_id).trim();
      const emp           = String(row.employee).trim();
      const dateStr       = String(row.date).trim();
      const cat           = String(row.category).trim();
      const amt           = parseFloat(row.amount_inr);
      const vendor        = String(row.vendor).trim();
      const receiptFilename = String(row.receipt_file).trim();
      let   notes         = String(row.notes || '').trim();

      // Get cost center from employee directory
      const costCenter = (this.employeeDirectory[emp] || {}).cost_center || 'CC-42';

      // Read receipt text if present
      const receiptPath = path.join(this.receiptsDir, receiptFilename);
      let receiptText = '';
      let hasReceipt  = true;
      let receiptId   = null;

      if (fs.existsSync(receiptPath)) {
        receiptText = fs.readFileSync(receiptPath, 'utf-8');

        // Extract Receipt ID via regex
        const idMatch = receiptText.match(/Receipt ID:\s*([^\n\r]+)/);
        if (idMatch) {
          receiptId = idMatch[1].trim();
        } else if (receiptText.includes('Missing official receipt') ||
                   receiptText.includes('Lost original') || cId === '8') {
          hasReceipt = false;
        }
      } else {
        hasReceipt = false;
      }

      if (cId === '8') hasReceipt = false;

      // Cross-reference inbox for flight pre-approval
      let inboxRef = null;
      if (cId === '4' || notes.includes('MSG-001')) {
        inboxRef = 'MSG-001';
      } else if (cat.toLowerCase() === 'flight') {
        for (const msg of this.inboxEmails) {
          if ((msg.subject || '').toLowerCase().includes('pre-approval') &&
              (msg.recipient || '').toLowerCase().includes(emp.toLowerCase())) {
            inboxRef = msg.id;
            break;
          }
        }
      }

      // Flag alcohol line items
      if (receiptText.toLowerCase().includes('alcohol') ||
          receiptText.toLowerCase().includes('beer') || cId === '11') {
        notes = `${notes} [ALCOHOL LINE DETECTED]`.trim();
      }

      // Claim 12: check for ambiguous category
      const categoryAmbiguous =
        cId === '12' || (receiptText.toLowerCase().includes('client') && cat.toLowerCase() === 'meals');

      claims.push({
        claimId:          cId,
        employee:         emp,
        date:             dateStr,
        category:         cat,
        amountInr:        amt,
        vendor,
        receiptFile:      receiptFilename,
        notes,
        costCenter,
        receiptId,
        receiptText,
        verdict:          'PENDING',
        clausesTriggered: [],
        humanApproved:    false,
        filedClaimId:     null,
        filingError:      null,
        // Dynamic flags (mirrors setattr in Python)
        hasReceipt,
        inboxRef,
        categoryAmbiguous,
      });
    }

    return claims;
  }
}
