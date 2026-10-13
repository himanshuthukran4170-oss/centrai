/**
 * ui.routes.js
 * Replaces Python ui/server.py — Dashboard API + SSE stream
 * GET  /ui/runs                    → list available run IDs
 * GET  /ui/state/:runId            → TaskState document
 * GET  /ui/report/:runId           → Markdown report content
 * POST /ui/approval/:runId/:claimId → submit human decision
 * GET  /ui/events/:runId           → SSE stream from MongoDB events
 */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TaskState from '../models/TaskState.js';
import AgentEvent from '../models/AgentEvent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.resolve(__dirname, '../../../reports');

const router = Router();

// Ensure reports dir exists
fs.mkdirSync(REPORTS_DIR, { recursive: true });

// GET /ui/runs
router.get('/ui/runs', async (_req, res) => {
  const states = await TaskState.find({}, 'runId updatedAt').sort({ updatedAt: -1 }).lean();
  res.json({ runs: states.map((s) => s.runId) });
});

// GET /ui/state/:runId
router.get('/ui/state/:runId', async (req, res) => {
  const state = await TaskState.findOne({ runId: req.params.runId }).lean();
  if (!state) return res.json({ error: 'Run not found' });
  res.json(state);
});

// GET /ui/report/:runId
router.get('/ui/report/:runId', (req, res) => {
  const { runId } = req.params;
  let reportPath = path.join(REPORTS_DIR, `run_${runId}_report.md`);
  if (!fs.existsSync(reportPath)) {
    reportPath = path.join(REPORTS_DIR, 'sample_run_report.md');
  }
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, 'utf-8');
    return res.json({ report });
  }
  res.json({ report: 'Report not yet generated for this run.' });
});

// POST /ui/approval/:runId/:claimId
router.post('/ui/approval/:runId/:claimId', async (req, res) => {
  const { runId, claimId } = req.params;
  const decision = String(req.body?.decision || 'DENIED').toUpperCase();
  const note = req.body?.note || 'Decided via web dashboard';

  await AgentEvent.create({
    runId,
    type: 'approval_response',
    payload: { claimId, decision, note },
  });

  res.json({ status: 'ok', decision, claimId });
});

// GET /ui/events/:runId — SSE stream
router.get('/ui/events/:runId', async (req, res) => {
  const { runId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let lastId = null; // Use MongoDB ObjectId
  const INTERVAL_MS = 500;

  const sendEvents = async () => {
    try {
      const query = { runId };
      if (lastId) query._id = { $gt: lastId };

      const events = await AgentEvent.find(query).sort({ _id: 1 }).lean();
      for (const ev of events) {
        lastId = ev._id;
        const data = JSON.stringify({
          id:        ev._id.toString(),
          runId:     ev.runId,
          timestamp: ev.timestamp,
          type:      ev.type,
          payload:   ev.payload,
        });
        res.write(`data: ${data}\n\n`);
      }
      if (typeof res.flush === 'function') res.flush();
    } catch {
      // Ignore transient errors during streaming
    }
  };

  const interval = setInterval(sendEvents, INTERVAL_MS);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;
