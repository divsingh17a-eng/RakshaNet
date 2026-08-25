/**
 * Exercises the real Express app (routing + auth + zod validation
 * middleware) without a live database. Every case here is designed to be
 * rejected before any Sequelize call happens, so no DATABASE_URL is needed -
 * this covers PRD sec.18 "Input validation on every API" and "backend-
 * enforced RBAC" for the cheap, DB-free slice of that surface. Full CRUD
 * behavior against real data is exercised manually via docs/DEMO_SCRIPT.md
 * against a live Postgres instance.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/rakshanet';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const createApp = require('../../backend/src/app');
const { signAccessToken } = require('../../backend/src/services/token.service');
const { ROLES } = require('../../backend/src/config/constants');

const app = createApp();

function tokenFor(role) {
  return signAccessToken({ id: 'test-user-id', role, name: 'Test User', phone: null, email: 'test@rakshanet.demo' });
}

describe('GET /api/health', () => {
  test('is always reachable with no auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('zod validation rejects bad input before it can reach the database', () => {
  test('POST /api/auth/login without a password is rejected 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'officer@rakshanet.demo' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login with a malformed email is rejected 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'whatever123' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/otp/request without a phone is rejected 400', async () => {
    const res = await request(app).post('/api/auth/otp/request').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/sos with valid auth but missing coordinates is rejected 400, not 500', async () => {
    const res = await request(app)
      .post('/api/sos')
      .set('Authorization', `Bearer ${tokenFor(ROLES.CITIZEN)}`)
      .send({ message: 'help' });
    expect(res.status).toBe(400);
  });
});

describe('authentication is enforced before any protected route runs', () => {
  test('POST /api/sos with no Authorization header is rejected 401', async () => {
    const res = await request(app).post('/api/sos').send({ lng: 77.06, lat: 10.08 });
    expect(res.status).toBe(401);
  });

  test('a garbage bearer token is rejected 401, not 500', async () => {
    const res = await request(app).post('/api/sos').set('Authorization', 'Bearer not-a-real-jwt').send({ lng: 77.06, lat: 10.08 });
    expect(res.status).toBe(401);
  });

  test('GET /api/audit-logs (Admin-only) rejects a Citizen token with 403', async () => {
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${tokenFor(ROLES.CITIZEN)}`);
    expect(res.status).toBe(403);
  });
});

describe('unknown routes and unhandled errors are shaped consistently', () => {
  test('an unknown route 404s with the standard error envelope', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ success: false, message: expect.any(String) }));
  });
});
