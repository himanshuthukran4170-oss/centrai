/**
 * app.js — Express application factory
 * Replaces Python finance_app/app.py + ui/server.py combined
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { injectionMiddleware } from './middleware/injection.middleware.js';
import authRouter    from './routes/auth.routes.js';
import claimsRouter  from './routes/claims.routes.js';
import apiRouter     from './routes/api.routes.js';
import adminRouter   from './routes/admin.routes.js';
import uiRouter      from './routes/ui.routes.js';
import agentRouter   from './routes/agent.routes.js';

export function createApp() {
  const app = express();

  // ── Core middleware ──────────────────────────────────────────
  app.use(morgan('dev'));
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Fault injection (before route handlers) ──────────────────
  app.use(injectionMiddleware);

  // ── Routes ───────────────────────────────────────────────────
  app.use('/', authRouter);
  app.use('/', claimsRouter);
  app.use('/', apiRouter);
  app.use('/', adminRouter);
  app.use('/', uiRouter);
  app.use('/', agentRouter);

  // ── Health check ─────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── Global error handler ──────────────────────────────────────
  app.use((err, _req, res, _next) => {
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}
