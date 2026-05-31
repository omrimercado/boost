/// <reference types="jest" />
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('dotenv/config', () => ({}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    trainerTrainee: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invite: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../services/redis.service', () => ({
  redisService: {
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    get: jest.fn(),
    getdel: jest.fn(),
  },
}));

jest.mock('../services/email.service', () => ({
  emailService: {
    sendInviteEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed_password'),
  compare: jest.fn(),
}));

import app from '../app';
import { prisma } from '../lib/prisma';
import { redisService } from '../services/redis.service';
import { emailService } from '../services/email.service';

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockUserCreate = prisma.user.create as jest.Mock;
const mockLinkFindFirst = prisma.trainerTrainee.findFirst as jest.Mock;
const mockLinkCreate = prisma.trainerTrainee.create as jest.Mock;
const mockLinkUpdate = prisma.trainerTrainee.update as jest.Mock;
const mockInviteFindUnique = prisma.invite.findUnique as jest.Mock;
const mockInviteCreate = prisma.invite.create as jest.Mock;
const mockInviteUpdate = prisma.invite.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockRedisSet = redisService.set as jest.Mock;
const mockRedisExists = redisService.exists as jest.Mock;
const mockSendInviteEmail = emailService.sendInviteEmail as jest.Mock;

const ACCESS_SECRET = 'test_access_secret_long_enough_32chars';
const REFRESH_SECRET = 'test_refresh_secret_long_enough_32ch';

const TRAINER_ID = 'trainer-uuid-001';
const TRAINEE_ID = 'trainee-uuid-002';
const TRAINER_EMAIL = 'trainer@example.com';
const INVITE_EMAIL = 'newtrainee@example.com';
const VALID_TOKEN = 'a'.repeat(64);
const LINK_ID = 'link-uuid-001';
const INVITE_ID = 'invite-uuid-001';

const mockTrainer = {
  id: TRAINER_ID,
  email: TRAINER_EMAIL,
  passwordHash: '$hashed',
  role: 'trainer',
  createdAt: new Date('2024-01-01'),
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 1000);

const mockInviteRecord = {
  id: INVITE_ID,
  trainerId: TRAINER_ID,
  email: INVITE_EMAIL,
  token: VALID_TOKEN,
  expiresAt: futureDate,
  usedAt: null,
  trainerTraineeId: LINK_ID,
  trainer: mockTrainer,
  trainerTrainee: { id: LINK_ID, trainerId: TRAINER_ID, traineeId: null, inviteEmail: INVITE_EMAIL, status: 'pending' },
};

function makeTrainerToken(): string {
  return jwt.sign({ sub: TRAINER_ID, role: 'trainer' }, ACCESS_SECRET, { expiresIn: '15m' });
}

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
  process.env.RESEND_FROM_EMAIL = 'noreply@test.com';
  process.env.APP_DEEP_LINK_BASE = 'boost://';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisSet.mockResolvedValue('OK');
  mockRedisExists.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// POST /invites
// ---------------------------------------------------------------------------
describe('POST /invites', () => {
  it('201 — trainer sends a fresh invite', async () => {
    mockUserFindUnique.mockResolvedValueOnce(mockTrainer); // trainer lookup
    mockUserFindUnique.mockResolvedValueOnce(null);         // email not registered
    mockLinkFindFirst.mockResolvedValueOnce(null);           // no active link
    mockLinkFindFirst.mockResolvedValueOnce(null);           // no pending link
    mockTransaction.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<void>) => {
      await fn(prisma);
    });
    mockLinkCreate.mockResolvedValueOnce({ id: LINK_ID });
    mockInviteCreate.mockResolvedValueOnce({ id: INVITE_ID });

    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${makeTrainerToken()}`)
      .send({ email: INVITE_EMAIL });

    expect(res.status).toBe(201);
    expect(res.body.data.message).toBe('Invite sent');
    expect(mockSendInviteEmail).toHaveBeenCalledTimes(1);
    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      INVITE_EMAIL,
      TRAINER_EMAIL,
      expect.stringContaining('invite?token='),
    );
  });

  it('201 — duplicate pending invite triggers resend with new token', async () => {
    const existingLink = { id: LINK_ID };
    mockUserFindUnique.mockResolvedValueOnce(mockTrainer);
    mockUserFindUnique.mockResolvedValueOnce(null);
    mockLinkFindFirst.mockResolvedValueOnce(null);     // no active link
    mockLinkFindFirst.mockResolvedValueOnce(existingLink); // pending link exists
    mockTransaction.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${makeTrainerToken()}`)
      .send({ email: INVITE_EMAIL });

    expect(res.status).toBe(201);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockSendInviteEmail).toHaveBeenCalledTimes(1);
  });

  it('409 USER_EXISTS — email already has a Boost account', async () => {
    mockUserFindUnique.mockResolvedValueOnce(mockTrainer); // trainer lookup
    mockUserFindUnique.mockResolvedValueOnce({ id: TRAINEE_ID, email: INVITE_EMAIL }); // email taken

    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${makeTrainerToken()}`)
      .send({ email: INVITE_EMAIL });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('USER_EXISTS');
    expect(mockSendInviteEmail).not.toHaveBeenCalled();
  });

  it('409 ALREADY_LINKED — trainee already actively linked', async () => {
    mockUserFindUnique.mockResolvedValueOnce(mockTrainer);
    mockUserFindUnique.mockResolvedValueOnce(null);
    mockLinkFindFirst.mockResolvedValueOnce({ id: LINK_ID, status: 'active' });

    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${makeTrainerToken()}`)
      .send({ email: INVITE_EMAIL });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ALREADY_LINKED');
    expect(mockSendInviteEmail).not.toHaveBeenCalled();
  });

  it('401 — unauthenticated request', async () => {
    const res = await request(app).post('/invites').send({ email: INVITE_EMAIL });
    expect(res.status).toBe(401);
  });

  it('403 — trainee cannot send invites', async () => {
    const traineeToken = jwt.sign({ sub: TRAINEE_ID, role: 'trainee' }, ACCESS_SECRET, { expiresIn: '15m' });
    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ email: INVITE_EMAIL });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — missing email', async () => {
    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${makeTrainerToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${makeTrainerToken()}`)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// GET /invites/:token
// ---------------------------------------------------------------------------
describe('GET /invites/:token', () => {
  it('200 — returns trainer name and invite email for valid token', async () => {
    mockInviteFindUnique.mockResolvedValueOnce(mockInviteRecord);

    const res = await request(app).get(`/invites/${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.trainerName).toBe(TRAINER_EMAIL);
    expect(res.body.data.inviteEmail).toBe(INVITE_EMAIL);
  });

  it('404 — unknown token', async () => {
    mockInviteFindUnique.mockResolvedValueOnce(null);

    const res = await request(app).get(`/invites/${VALID_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('410 INVITE_USED — token already consumed', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({ ...mockInviteRecord, usedAt: new Date() });

    const res = await request(app).get(`/invites/${VALID_TOKEN}`);

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('INVITE_USED');
  });

  it('410 INVITE_EXPIRED — token past expiresAt', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({ ...mockInviteRecord, expiresAt: pastDate });

    const res = await request(app).get(`/invites/${VALID_TOKEN}`);

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('INVITE_EXPIRED');
  });
});

// ---------------------------------------------------------------------------
// POST /invites/:token/accept
// ---------------------------------------------------------------------------
describe('POST /invites/:token/accept', () => {
  it('201 — registers trainee and links to trainer, returns tokens', async () => {
    mockInviteFindUnique.mockResolvedValueOnce(mockInviteRecord);
    mockUserFindUnique.mockResolvedValueOnce(null); // email not taken

    const newTrainee = {
      id: TRAINEE_ID,
      email: INVITE_EMAIL,
      passwordHash: '$hashed_password',
      role: 'trainee',
      createdAt: new Date(),
    };
    mockTransaction.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<typeof newTrainee>) => fn(prisma));
    mockUserCreate.mockResolvedValueOnce(newTrainee);
    mockLinkUpdate.mockResolvedValueOnce({});
    mockInviteUpdate.mockResolvedValueOnce({});

    const res = await request(app)
      .post(`/invites/${VALID_TOKEN}/accept`)
      .send({ password: 'Password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(INVITE_EMAIL);
    expect(res.body.data.user.role).toBe('trainee');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('404 — unknown token', async () => {
    mockInviteFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/invites/${VALID_TOKEN}/accept`)
      .send({ password: 'Password123' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('410 INVITE_USED — token already consumed', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({ ...mockInviteRecord, usedAt: new Date() });

    const res = await request(app)
      .post(`/invites/${VALID_TOKEN}/accept`)
      .send({ password: 'Password123' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('INVITE_USED');
  });

  it('410 INVITE_EXPIRED — token past expiresAt', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({ ...mockInviteRecord, expiresAt: pastDate });

    const res = await request(app)
      .post(`/invites/${VALID_TOKEN}/accept`)
      .send({ password: 'Password123' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('INVITE_EXPIRED');
  });

  it('409 USER_EXISTS — email registered between invite send and accept', async () => {
    mockInviteFindUnique.mockResolvedValueOnce(mockInviteRecord);
    mockUserFindUnique.mockResolvedValueOnce({ id: 'other-user', email: INVITE_EMAIL });

    const res = await request(app)
      .post(`/invites/${VALID_TOKEN}/accept`)
      .send({ password: 'Password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('USER_EXISTS');
  });

  it('400 — missing password', async () => {
    const res = await request(app).post(`/invites/${VALID_TOKEN}/accept`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — password shorter than 8 characters', async () => {
    const res = await request(app)
      .post(`/invites/${VALID_TOKEN}/accept`)
      .send({ password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
