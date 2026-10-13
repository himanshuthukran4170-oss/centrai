/**
 * e2e.test.js — End-to-End API Integration Tests using Supertest
 */
import request from 'supertest';
import { createApp } from '../server/src/app.js';
import User from '../server/src/models/User.js';
import ExpenseClaim from '../server/src/models/ExpenseClaim.js';
import bcrypt from 'bcryptjs';

describe('E2E Server API Integration', () => {
  let app;
  let authCookie;

  beforeAll(async () => {
    app = createApp();

    // Mock User findOne for login
    jest.spyOn(User, 'findOne').mockImplementation(({ username }) => {
      if (username === 'operator') {
        const hash = bcrypt.hashSync('password', 10);
        return Promise.resolve({
          _id: '507f1f77bcf86cd799439011',
          username: 'operator',
          passwordHash: hash,
          isAdmin: false,
          toObject: () => ({ username: 'operator', isAdmin: false }),
        });
      }
      return Promise.resolve(null);
    });

    // Mock User findById for auth middleware
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      username: 'operator',
      isAdmin: false,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('POST /login authenticates operator and returns JWT cookie', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'operator', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.username).toBe('operator');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0];
    expect(authCookie).toContain('session_token');
  });

  test('GET /claims requires authentication', async () => {
    const res = await request(app).get('/claims');
    expect(res.status).toBe(401);
  });

  test('POST /claims/new validates required fields', async () => {
    const res = await request(app)
      .post('/claims/new')
      .set('Cookie', authCookie)
      .send({ employee: 'Priya Sharma' }); // missing amount, date, etc.

    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
  });

  test('GET /api/claims is accessible without authentication (verifier endpoint)', async () => {
    jest.spyOn(ExpenseClaim, 'find').mockReturnValue({
      sort: () => Promise.resolve([
        {
          _id: '507f1f77bcf86cd799439012',
          employee: 'Priya Sharma',
          date: '2026-10-08',
          category: 'Meals',
          amountInr: 850.0,
          vendor: 'Main Street Cafe',
          status: 'SUBMITTED',
        },
      ]),
    });

    const res = await request(app).get('/api/claims?employee=Priya%20Sharma');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data || res.body)).toBe(true);
  });

  test('GET /admin blocks non-admin users', async () => {
    const res = await request(app)
      .get('/admin')
      .set('Cookie', authCookie);

    expect(res.status).toBe(403);
  });
});
