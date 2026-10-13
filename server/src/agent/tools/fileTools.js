/**
 * fileTools.js — File exploration and reading tools
 * Replaces Python agent/tools/file_tools.py
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ToolResult } from './schemas.js';

export function listFiles(dirPath = '.') {
  try {
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) {
      return new ToolResult({ ok: false, error: `Path not found: ${dirPath}` });
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return new ToolResult({ ok: false, error: `Path is not a directory: ${dirPath}` });
    }

    const items = fs.readdirSync(resolved)
      .filter(item => !item.startsWith('.'))
      .sort();

    return new ToolResult({
      ok: true,
      data: { files: items, count: items.length },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Error listing files: ${err.message}` });
  }
}

export function readFile(filePath) {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return new ToolResult({ ok: false, error: `File not found: ${filePath}` });
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return new ToolResult({ ok: false, error: `Path is a directory, not a file: ${filePath}` });
    }

    const ext = path.extname(resolved).toLowerCase();

    if (ext === '.json') {
      const raw = fs.readFileSync(resolved, 'utf-8');
      const data = JSON.parse(raw);
      return new ToolResult({
        ok: true,
        data: { content: data, format: 'json', source: filePath },
      });
    }

    if (ext === '.csv') {
      const raw = fs.readFileSync(resolved, 'utf-8');
      const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
      return new ToolResult({
        ok: true,
        data: { rows, count: rows.length, format: 'csv', source: filePath },
      });
    }

    const text = fs.readFileSync(resolved, 'utf-8');
    return new ToolResult({
      ok: true,
      data: { content: text, format: 'text', source: filePath },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Error reading file ${filePath}: ${err.message}` });
  }
}

export default { listFiles, readFile };
