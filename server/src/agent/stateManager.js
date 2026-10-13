/**
 * stateManager.js
 * Replaces Python agent/state.py — TaskState dataclass + save/load via JSON files
 * Now persists to MongoDB TaskState collection.
 */
import TaskState from '../models/TaskState.js';

export class StateManager {
  /**
   * Create a new run state document in MongoDB.
   * @param {string} runId
   * @param {string} goal
   * @returns {Promise<object>} The created state document
   */
  static async create(runId, goal) {
    const state = await TaskState.create({ runId, goal });
    return state.toObject();
  }

  /**
   * Load state by runId.
   * @param {string} runId
   * @returns {Promise<object|null>}
   */
  static async load(runId) {
    const state = await TaskState.findOne({ runId }).lean();
    return state || null;
  }

  /**
   * Save (upsert) a full state object.
   * @param {object} stateObj - plain object with runId
   * @returns {Promise<object>}
   */
  static async save(stateObj) {
    const doc = await TaskState.findOneAndUpdate(
      { runId: stateObj.runId },
      stateObj,
      { upsert: true, new: true }
    ).lean();
    return doc;
  }

  /**
   * Partially update a run state.
   * @param {string} runId
   * @param {object} partial - partial fields to update
   */
  static async update(runId, partial) {
    return TaskState.findOneAndUpdate({ runId }, { $set: partial }, { new: true }).lean();
  }

  /**
   * Build a compact summary string for LLM context (< 800 tokens).
   * Mirrors Python TaskState.compact_summary()
   */
  static compactSummary(state) {
    const lines = [
      `GOAL: ${state.goal}`,
      `RUN ID: ${state.runId} | STEP: ${state.stepIndex} | TOKENS: ${state.tokensUsed} | COST: $${(state.totalCostUsd || 0).toFixed(4)}`,
      'PLAN PROGRESS:',
    ];

    for (const step of (state.plan || [])) {
      const badge = `[${step.status}]`;
      const err = step.error ? ` (Error: ${step.error})` : '';
      lines.push(`  ${step.id}. ${badge} ${step.description}${err}`);
    }

    if ((state.claims || []).length > 0) {
      const counts = {};
      for (const c of state.claims) {
        counts[c.verdict] = (counts[c.verdict] || 0) + 1;
      }
      lines.push(`CLAIMS SUMMARY: ${state.claims.length} total claims ${JSON.stringify(counts)}`);
    }

    if (state.lastError) {
      lines.push(`LAST RECOVERABLE ERROR: ${state.lastError}`);
    }

    return lines.join('\n');
  }
}
