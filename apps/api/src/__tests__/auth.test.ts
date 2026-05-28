import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock external dependencies before any module resolves
jest.mock('dotenv/config', () => ({}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../services/redis.service', () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    getdel: jest.fn(),
  },
  default: {},
}));

jest.mock('../services/email.service', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed_password'),
  compare: jest.fn(),
}));

// Import after mocks are registered
import app from '../app';
import { prisma } from '../lib/prisma';
import { redisService } from '../services/redis.service';
import { emailService } from '../services/email.service';
import bcrypt from 'bcryptjs';

// Typed mock helpers
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockRedisGet = redisService.get as jest.Mock;
const mockRedisSet = redisService.set as jest.Mock;
const mockRedisDel = redisService.del as jest.Mock;
const mockRedisExists = redisService.exists as jest.Mock;
const mockRedisGetdel = redisService.getdel as jest.Mock;
const mockSendEmail = emailService.sendPasswordResetEmail as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

// Shared test fixtures
const TEST_USER_ID = 'user-abc-123';
const TEST_EMAIL = 'trainer@example.com';
const TEST_PASSWORD = 'Password123';

const mockDbUser = {
  id: TEST_USER_ID,
  email: TEST_EMAIL,
  passwordHash: '$hashed_password',
  role: 'trainer',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const ACCESS_SECRET = 'test_access_secret_long_enough_32chars';
const REFRESH_SECRET = 'test_refresh_secret_long_enough_32ch';

function makeRefreshToken(userId: string, jti = 'test-jti-uuid'): string {
  return jwt.sign({ sub: userId, jti }, REFRESH_SECRET, { expiresIn: '30d' });
}

function makeExpiredRefreshToken(userId: string): string {
  const past = Math.floor(Date.now() / 1000) - 3700;
  return jwt.sign({ sub: userId, jti: 'expired-jti', iat: past }, REFRESH_SECRET, { expiresIn: '1h' });
}

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
  process.env.RESEND_FROM_EMAIL = 'noreply@test.com';
  process.env.APP_DEEP_LINK_BASE = 'boost://';
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reasonable defaults so tests only override what they care about
  mockRedisSet.mockResolvedValue('OK');
  mockRedisDel.mockResolvedValue(1);
  mockRedisGet.mockResolvedValue(null);
  mockRedisExists.mockResolvedValue(0);
  mockRedisGetdel.mockResolvedValue(null);
  mockSendEmail.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------
describe('POST /auth/register', () => {
  it('201 — creates a trainer and returns tokens', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(mockDbUser);

    const res = await request(app).post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      role: 'trainer',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.role).toBe('trainer');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('201 — creates a trainee', async () => {
    const traineeUser = { ...mockDbUser, role: 'trainee', email: 'trainee@example.com' };
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(traineeUser);

    const res = await request(app).post('/auth/register').send({
      email: 'trainee@example.com',
      password: TEST_PASSWORD,
      role: 'trainee',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('trainee');
  });

  it('409 — duplicate email', async () => {
    mockFindUnique.mockResolvedValueOnce(mockDbUser);

    const res = await request(app).post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      role: 'trainer',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('400 — missing email', async () => {
    const res = await request(app).post('/auth/register').send({
      password: TEST_PASSWORD,
      role: 'trainer',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid email format', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      password: TEST_PASSWORD,
      role: 'trainer',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — password shorter than 8 characters', async () => {
    const res = await request(app).post('/auth/register').send({
      email: TEST_EMAIL,
      password: 'short',
      role: 'trainer',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing role', async () => {
    const res = await request(app).post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid role value', async () => {
    const res = await request(app).post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing password', async () => {
    const res = await request(app).post('/auth/register').send({
      email: TEST_EMAIL,
      role: 'trainer',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
describe('POST /auth/login', () => {
  it('200 — valid credentials return user + tokens', async () => {
    mockFindUnique.mockResolvedValueOnce(mockDbUser);
    mockBcryptCompare.mockResolvedValueOnce(true);

    const res = await request(app).post('/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(TEST_USER_ID);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('401 — email not registered', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('401 — wrong password', async () => {
    mockFindUnique.mockResolvedValueOnce(mockDbUser);
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request(app).post('/auth/login').send({
      email: TEST_EMAIL,
      password: 'WrongPassword1',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
    // Same message — no indication of which field was wrong
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('400 — missing email', async () => {
    const res = await request(app).post('/auth/login').send({ password: TEST_PASSWORD });
    expect(res.status).toBe(400);
  });

  it('400 — missing password', async () => {
    const res = await request(app).post('/auth/login').send({ email: TEST_EMAIL });
    expect(res.status).toBe(400);
  });

  it('400 — malformed email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'bad@@email',
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------
describe('POST /auth/refresh', () => {
  it('200 — valid refresh token rotates both tokens', async () => {
    const token = makeRefreshToken(TEST_USER_ID);
    mockRedisExists.mockResolvedValueOnce(1); // token is active
    mockFindUnique.mockResolvedValueOnce(mockDbUser);

    const res = await request(app).post('/auth/refresh').send({ refreshToken: token });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    // Old token revoked, new one stored
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('400 — missing refreshToken field', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('401 — tampered / invalid signature', async () => {
    const res = await request(app).post('/auth/refresh').send({
      refreshToken: 'this.is.not.a.valid.jwt',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('401 — expired refresh token', async () => {
    const expiredToken = makeExpiredRefreshToken(TEST_USER_ID);
    const res = await request(app).post('/auth/refresh').send({ refreshToken: expiredToken });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('401 — refresh token not in Redis (already revoked)', async () => {
    const token = makeRefreshToken(TEST_USER_ID);
    mockRedisExists.mockResolvedValueOnce(0); // not in Redis

    const res = await request(app).post('/auth/refresh').send({ refreshToken: token });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/revoked/i);
  });

  it('401 — user deleted after token was issued', async () => {
    const token = makeRefreshToken(TEST_USER_ID);
    mockRedisExists.mockResolvedValueOnce(1);
    mockFindUnique.mockResolvedValueOnce(null); // user gone

    const res = await request(app).post('/auth/refresh').send({ refreshToken: token });

    expect(res.status).toBe(401);
  });

  it('signed with wrong secret is rejected', async () => {
    const badToken = jwt.sign(
      { sub: TEST_USER_ID, jti: 'some-jti' },
      'completely_wrong_secret_value_here',
      { expiresIn: '30d' },
    );
    const res = await request(app).post('/auth/refresh').send({ refreshToken: badToken });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
describe('POST /auth/logout', () => {
  it('204 — valid token is revoked', async () => {
    const token = makeRefreshToken(TEST_USER_ID);
    const res = await request(app).post('/auth/logout').send({ refreshToken: token });

    expect(res.status).toBe(204);
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
  });

  it('204 — already-revoked / invalid token still returns 204 (idempotent)', async () => {
    // An invalid JWT signature — authService.verifyRefreshToken returns null,
    // so we skip the Redis delete and still return 204
    const res = await request(app).post('/auth/logout').send({
      refreshToken: 'invalid.jwt.token',
    });

    expect(res.status).toBe(204);
    expect(mockRedisDel).not.toHaveBeenCalled();
  });

  it('400 — missing refreshToken field', async () => {
    const res = await request(app).post('/auth/logout').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------
describe('POST /auth/forgot-password', () => {
  it('200 — existing email sends reset email and stores token', async () => {
    mockFindUnique.mockResolvedValueOnce(mockDbUser);

    const res = await request(app).post('/auth/forgot-password').send({ email: TEST_EMAIL });

    expect(res.status).toBe(200);
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(TEST_EMAIL, expect.stringContaining('reset-password'));
  });

  it('200 — non-existent email returns 200 without leaking user existence', async () => {
    mockFindUnique.mockResolvedValueOnce(null); // user not found

    const res = await request(app).post('/auth/forgot-password').send({
      email: 'nobody@example.com',
    });

    expect(res.status).toBe(200);
    // No email sent, no Redis entry
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
    // Response body should be identical to the "found" case
    expect(res.body.data.message).toMatch(/reset link/i);
  });

  it('400 — invalid email format', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'bad-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing email', async () => {
    const res = await request(app).post('/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------------------
describe('POST /auth/reset-password', () => {
  it('200 — valid token updates the password and deletes the token', async () => {
    const resetToken = 'a'.repeat(64); // 32 bytes hex = 64 chars
    mockRedisGetdel.mockResolvedValueOnce(TEST_USER_ID); // atomic get+delete
    mockUpdate.mockResolvedValueOnce(mockDbUser);

    const res = await request(app).post('/auth/reset-password').send({
      token: resetToken,
      password: 'NewPassword1',
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
      data: { passwordHash: '$hashed_password' },
    });
    expect(mockRedisGetdel).toHaveBeenCalledWith(`reset:${resetToken}`);
  });

  it('400 — invalid or expired token (not in Redis)', async () => {
    mockRedisGetdel.mockResolvedValueOnce(null); // token not found / expired

    const res = await request(app).post('/auth/reset-password').send({
      token: 'expiredtoken',
      password: 'NewPassword1',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TOKEN');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('400 — token can only be used once (consumed on first use)', async () => {
    const resetToken = 'b'.repeat(64);
    // First call: getdel atomically returns and removes the token
    mockRedisGetdel.mockResolvedValueOnce(TEST_USER_ID);
    mockUpdate.mockResolvedValueOnce(mockDbUser);
    await request(app).post('/auth/reset-password').send({
      token: resetToken,
      password: 'NewPassword1',
    });

    // Second call: token already consumed (getdel returns null)
    mockRedisGetdel.mockResolvedValueOnce(null);
    const res = await request(app).post('/auth/reset-password').send({
      token: resetToken,
      password: 'AnotherPass1',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('400 — missing token', async () => {
    const res = await request(app).post('/auth/reset-password').send({ password: 'NewPassword1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing password', async () => {
    const res = await request(app).post('/auth/reset-password').send({ token: 'sometoken' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — new password shorter than 8 characters', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      token: 'sometoken',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Auth middleware (requireAuth)
// ---------------------------------------------------------------------------
describe('requireAuth middleware', () => {
  // Attach a protected test route to verify the middleware in isolation
  beforeAll(async () => {
    const { requireAuth } = await import('../middleware/auth.middleware');
    app.get('/test-protected', requireAuth, (_req, res) => res.json({ ok: true }));
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app).get('/test-protected');
    expect(res.status).toBe(401);
  });

  it('401 — malformed header (no Bearer prefix)', async () => {
    const res = await request(app)
      .get('/test-protected')
      .set('Authorization', 'Token abc123');
    expect(res.status).toBe(401);
  });

  it('401 — expired access token', async () => {
    const past = Math.floor(Date.now() / 1000) - 3700;
    const expiredAccess = jwt.sign(
      { sub: TEST_USER_ID, role: 'trainer', iat: past },
      ACCESS_SECRET,
      { expiresIn: '1h' },
    );
    const res = await request(app)
      .get('/test-protected')
      .set('Authorization', `Bearer ${expiredAccess}`);
    expect(res.status).toBe(401);
  });

  it('401 — token signed with wrong secret', async () => {
    const badToken = jwt.sign({ sub: TEST_USER_ID, role: 'trainer' }, 'wrong_secret', {
      expiresIn: '15m',
    });
    const res = await request(app)
      .get('/test-protected')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  it('200 — valid access token passes through', async () => {
    const validToken = jwt.sign({ sub: TEST_USER_ID, role: 'trainer' }, ACCESS_SECRET, {
      expiresIn: '15m',
    });
    const res = await request(app)
      .get('/test-protected')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
