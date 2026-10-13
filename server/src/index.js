/**
 * index.js — Server entry point
 * Replaces: uvicorn finance_app.app:app + uvicorn ui.server:app
 * Single Express server on PORT (default 8000) handles all routes.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '8000', 10);

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[Server] CenterAlign MERN backend running on http://localhost:${PORT}`);
    console.log(`[Server] Finance Portal API  → http://localhost:${PORT}/claims`);
    console.log(`[Server] Dashboard API       → http://localhost:${PORT}/ui/runs`);
    console.log(`[Server] Verifier API        → http://localhost:${PORT}/api/claims`);
  });
}

main();
