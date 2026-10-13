/**
 * seed.js — seeds default users into MongoDB and clears data on reset
 * Replaces Python finance_app/seed.py
 * Run: node server/src/seed/seed.js [--reset]
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import ExpenseClaim from '../models/ExpenseClaim.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/centralign';
const SALT_ROUNDS = 10;

export async function seedDatabase(reset = false, disconnect = false) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected to MongoDB');
  }

  if (reset) {
    await User.deleteMany({});
    await ExpenseClaim.deleteMany({});
    console.log('[Seed] Database collections cleared (Users, ExpenseClaims)');
  }

  const users = [
    { username: 'admin',    password: 'password', isAdmin: true },
    { username: 'operator', password: 'password', isAdmin: false },
  ];

  for (const u of users) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await User.create({ username: u.username, passwordHash, isAdmin: u.isAdmin });
      console.log(`[Seed] Created user: ${u.username}`);
    } else {
      console.log(`[Seed] User already exists: ${u.username}`);
    }
  }

  const userCount = await User.countDocuments();
  console.log(`[Seed] Done. Total users in DB: ${userCount}`);

  if (disconnect) {
    await mongoose.disconnect();
  }
}

// Run directly from CLI
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (executedFilePath === path.resolve(currentFilePath) || executedFilePath.endsWith('seed.js')) {
  const reset = process.argv.includes('--reset');
  seedDatabase(reset, true).catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
}

export default seedDatabase;
