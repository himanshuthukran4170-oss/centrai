/**
 * agent.routes.js — Agent execution and status endpoints
 * POST /agent/run         → start run in background
 * GET  /agent/status/:runId → get TaskState
 */
import { Router } from 'express';
import crypto from 'crypto';
import { AgentOrchestrator } from '../agent/orchestrator.js';
import { StateManager } from '../agent/stateManager.js';

const router = Router();

router.post('/agent/run', async (req, res, next) => {
  try {
    const {
      goal = "Process Priya Sharma's Q3 expense claims",
      scenarioName = 's2',
      autoApprovals = { '4': 'APPROVED', '12': 'APPROVED', '5': 'DENIED', '7': 'DENIED' },
      runId = `run_${crypto.randomBytes(4).toString('hex')}`,
    } = req.body || {};

    const orchestrator = new AgentOrchestrator(runId, goal);

    // Launch asynchronously in background
    setImmediate(async () => {
      try {
        console.log(`[Agent] Starting run ${runId} in background...`);
        await orchestrator.processAllClaims(autoApprovals, scenarioName);
        console.log(`[Agent] Completed run ${runId}`);
      } catch (err) {
        console.error(`[Agent] Run ${runId} failed:`, err);
        await StateManager.update(runId, { lastError: err.message }).catch(() => {});
      }
    });

    res.status(202).json({
      runId,
      status: 'started',
      goal,
      scenarioName,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/agent/status/:runId', async (req, res, next) => {
  try {
    const { runId } = req.params;
    const state = await StateManager.load(runId);
    if (!state) {
      return res.status(404).json({ error: `Run '${runId}' not found` });
    }
    res.json(state);
  } catch (err) {
    next(err);
  }
});

export default router;
