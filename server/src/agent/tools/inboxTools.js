/**
 * inboxTools.js — Email inbox search and inspection tools
 * Replaces Python agent/tools/inbox_tools.py
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ToolResult } from './schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INBOX_PATH = path.resolve(__dirname, '../../../../company_context/inbox_export.json');

export function readInbox(query, inboxPath = DEFAULT_INBOX_PATH) {
  try {
    const resolved = path.resolve(inboxPath);
    if (!fs.existsSync(resolved)) {
      return new ToolResult({ ok: false, error: `Inbox file not found: ${inboxPath}` });
    }

    const emails = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    const queryTerms = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
    const matches = [];

    for (const msg of emails) {
      const labels = Array.isArray(msg.labels) ? msg.labels.join(' ') : '';
      const searchableText = [
        msg.id || '',
        msg.sender || '',
        msg.recipient || '',
        msg.subject || '',
        msg.body || '',
        labels,
      ].join(' ').toLowerCase();

      const score = queryTerms.reduce((acc, term) => acc + (searchableText.includes(term) ? 1 : 0), 0);
      if (score > 0 || queryTerms.length === 0) {
        matches.push({ score, msg });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const results = matches.map(m => m.msg);

    return new ToolResult({
      ok: true,
      data: {
        query,
        matches: results,
        total_found: results.length,
      },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Error reading inbox: ${err.message}` });
  }
}

export default { readInbox };
