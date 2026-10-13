/**
 * contextLayer.js
 * Replaces Python agent/context_layer.py
 * Context retrieval layer for company policies, SOPs, and employee directories.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTEXT_DIR = path.resolve(__dirname, '../../../company_context');

export class Passage {
  constructor({ sourceFile, sectionHeading, text, relevanceScore = 0.0 }) {
    this.sourceFile = sourceFile;
    this.sectionHeading = sectionHeading;
    this.text = text;
    this.relevanceScore = relevanceScore;
  }

  toObject() {
    return {
      sourceFile: this.sourceFile,
      sectionHeading: this.sectionHeading,
      text: this.text,
      relevanceScore: this.relevanceScore,
    };
  }
}

export class ContextLayer {
  constructor(contextDir = CONTEXT_DIR) {
    this.contextDir = contextDir;
    this.passages = [];
    this.loadDocuments();
  }

  loadDocuments() {
    if (!fs.existsSync(this.contextDir)) {
      return;
    }

    // 1. Parse policy.md by sections (clauses)
    const policyPath = path.join(this.contextDir, 'policy.md');
    if (fs.existsSync(policyPath)) {
      const text = fs.readFileSync(policyPath, 'utf-8');
      const sections = text.split(/\n(?=### )/);
      for (const sec of sections) {
        const lines = sec.trim().split('\n');
        const heading = lines[0] ? lines[0].replace(/###/g, '').trim() : 'Policy';
        const body = lines.length > 1 ? lines.slice(1).join('\n').trim() : sec.trim();
        this.passages.push(
          new Passage({
            sourceFile: 'policy.md',
            sectionHeading: heading,
            text: `${heading}\n${body}`,
            relevanceScore: 0.0,
          })
        );
      }
    }

    // 2. Parse approvals_matrix.json
    const matrixPath = path.join(this.contextDir, 'approvals_matrix.json');
    if (fs.existsSync(matrixPath)) {
      try {
        const matrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        for (const item of matrixData) {
          const category = item.category || '';
          const minAmt = item.amount_min ?? 0;
          const maxAmt = item.amount_max ?? 'No limit';
          const approver = item.approver_role || '';
          const clause = item.clause || '';
          const desc = `Category: ${category}, Range: ₹${minAmt} to ₹${maxAmt}, Approver: ${approver}, Clause: ${clause}`;
          this.passages.push(
            new Passage({
              sourceFile: 'approvals_matrix.json',
              sectionHeading: `Approval Rule: ${category} (${clause})`,
              text: desc,
              relevanceScore: 0.0,
            })
          );
        }
      } catch (err) {
        console.error('[ContextLayer] Failed to parse approvals_matrix.json:', err.message);
      }
    }

    // 3. Parse sop_expense_entry.md
    const sopPath = path.join(this.contextDir, 'sop_expense_entry.md');
    if (fs.existsSync(sopPath)) {
      const sopText = fs.readFileSync(sopPath, 'utf-8');
      const sopSections = sopText.split(/\n(?=## )/);
      for (const sec of sopSections) {
        const lines = sec.trim().split('\n');
        const heading = lines[0] ? lines[0].replace(/##/g, '').trim() : 'SOP Step';
        const body = lines.length > 1 ? lines.slice(1).join('\n').trim() : sec.trim();
        this.passages.push(
          new Passage({
            sourceFile: 'sop_expense_entry.md',
            sectionHeading: heading,
            text: `${heading}\n${body}`,
            relevanceScore: 0.0,
          })
        );
      }
    }

    // 4. Parse employee_directory.json
    const empPath = path.join(this.contextDir, 'employee_directory.json');
    if (fs.existsSync(empPath)) {
      try {
        const empData = JSON.parse(fs.readFileSync(empPath, 'utf-8'));
        for (const [empName, info] of Object.entries(empData)) {
          const infoText = `Employee: ${empName}, Cost Center: ${info.cost_center}, Manager: ${info.manager}, Email: ${info.email}, Dept: ${info.department}`;
          this.passages.push(
            new Passage({
              sourceFile: 'employee_directory.json',
              sectionHeading: `Employee Record: ${empName}`,
              text: infoText,
              relevanceScore: 0.0,
            })
          );
        }
      } catch (err) {
        console.error('[ContextLayer] Failed to parse employee_directory.json:', err.message);
      }
    }
  }

  search(query, topK = 5) {
    const rawTokens = (query.toLowerCase().match(/\w+/g) || []);
    const queryTokens = new Set(rawTokens);
    if (queryTokens.size === 0) {
      return this.passages.slice(0, topK);
    }

    const scored = [];
    for (const p of this.passages) {
      const docText = `${p.sectionHeading} ${p.text}`.toLowerCase();
      const docTokens = new Set(docText.match(/\w+/g) || []);
      
      let overlapCount = 0;
      for (const token of queryTokens) {
        if (docTokens.has(token)) {
          overlapCount++;
        }
      }

      let exactBonus = 0;
      for (const token of queryTokens) {
        if (docText.includes(token)) {
          exactBonus += 2.0;
        }
      }

      const score = (overlapCount * 1.5) + exactBonus;
      if (score > 0) {
        scored.push(
          new Passage({
            sourceFile: p.sourceFile,
            sectionHeading: p.sectionHeading,
            text: p.text,
            relevanceScore: score,
          })
        );
      }
    }

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, topK);
  }
}

let _contextLayer = null;

export function getContextLayer() {
  if (!_contextLayer) {
    _contextLayer = new ContextLayer();
  }
  return _contextLayer;
}

export function searchCompanyContext(query, topK = 5) {
  return getContextLayer().search(query, topK);
}

export default ContextLayer;
