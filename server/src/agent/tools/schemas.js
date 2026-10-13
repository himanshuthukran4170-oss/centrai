/**
 * schemas.js — Standard schemas for tool execution results
 * Replaces Python agent/tools/schemas.py
 */

export class ToolResult {
  constructor({ ok, data = {}, error = null }) {
    this.ok = ok;
    this.data = data;
    this.error = error;
  }

  toObject() {
    return {
      ok: this.ok,
      data: this.data,
      error: this.error,
    };
  }
}

export default ToolResult;
