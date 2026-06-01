/// <reference types="jest" />
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('dotenv/config', () => ({}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    trainerTrainee: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sessionRead: {
      upsert: jest.fn(),
    },
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

import app from '../app';
import { prisma } from '../lib/prisma';
import { redisService } from '../services/redis.service';

const mockLinkFindMany = prisma.trainerTrainee.findMany as jest.Mock;
const mockLinkFindFirst = prisma.trainerTrainee.findFirst as jest.Mock;
const mockSessionFindUnique = prisma.session.findUnique as jest.Mock;
const mockSessionFindMany = prisma.session.findMany as jest.Mock;
const mockSessionCount = prisma.session.count as jest.Mock;
const mockSessionReadUpsert = prisma.sessionRead.upsert as jest.Mock;
const mockRedisExists = redisService.exists as jest.Mock;

const ACCESS_SECRET = 'test_access_secret_long_enough_32chars';
const REFRESH_SECRET = 'test_refresh_secret_long_enough_32ch';

const TRAINER_ID = '11111111-1111-4111-a111-111111111111';
const TRAINEE_ID = '22222222-2222-4222-a222-222222222222';
const SESSION_ID = '55555555-5555-4555-a555-555555555555';
const SET_ID = '66666666-6666-4666-a666-666666666666';
const FORM_SCORE_ID = '77777777-7777-4777-a777-777777777777';
const LINK_ID = '88888888-8888-4888-a888-888888888888';
const LINK_ID_2 = '99999999-9999-4999-a999-999999999999';

function makeToken(sub: string, role: 'trainer' | 'trainee'): string {
  return jwt.sign({ sub, role }, ACCESS_SECRET, { expiresIn: '15m' });
}

const trainerToken = makeToken(TRAINER_ID, 'trainer');
const traineeToken = makeToken(TRAINEE_ID, 'trainee');

const mockActiveLinkRecord = {
  id: LINK_ID,
  trainerId: TRAINER_ID,
  traineeId: TRAINEE_ID,
  inviteEmail: 'trainee@example.com',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  trainee: { id: TRAINEE_ID, email: 'trainee@example.com' },
};

const mockPendingLinkRecord = {
  id: LINK_ID_2,
  trainerId: TRAINER_ID,
  traineeId: null,
  inviteEmail: 'pending@example.com',
  status: 'pending',
  createdAt: new Date('2024-01-02T00:00:00Z'),
  trainee: null,
};

const mockSessionRecord = {
  id: SESSION_ID,
  traineeId: TRAINEE_ID,
  startedAt: new Date('2024-06-01T10:00:00Z'),
  endedAt: null,
};

const mockEndedSessionRecord = {
  ...mockSessionRecord,
  endedAt: new Date('2024-06-01T11:00:00Z'),
};

const mockSetRecord = {
  id: SET_ID,
  sessionId: SESSION_ID,
  exerciseName: 'squat',
  weightKg: { toNumber: () => 80 },
  reps: 5,
  setNumber: 1,
  loggedAt: new Date('2024-06-01T10:10:00Z'),
};

const mockFormScoreRecord = {
  id: FORM_SCORE_ID,
  setId: SET_ID,
  scoreTier: 'red',
  coachingText: 'Knees caving — focus on pushing them out',
  angleData: { knee: { min: 70, max: 90, avg: 80, deviationCount: 5 } },
  confidenceLevel: { toNumber: () => 0.88 },
  createdAt: new Date('2024-06-01T10:11:00Z'),
};

const mockSessionReadRecord = {
  trainerId: TRAINER_ID,
  sessionId: SESSION_ID,
  readAt: new Date('2024-06-01T12:00:00Z'),
};

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisExists.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// GET /trainer/trainees
// ---------------------------------------------------------------------------
describe('GET /trainer/trainees', () => {
  it('200 — returns active and pending trainees with metadata', async () => {
    mockLinkFindMany.mockResolvedValueOnce([mockActiveLinkRecord, mockPendingLinkRecord]);
    // lastSessions batch query
    mockSessionFindMany.mockResolvedValueOnce([
      { traineeId: TRAINEE_ID, startedAt: new Date('2024-06-01T10:00:00Z') },
    ]);
    // unreadRedSessions batch query
    mockSessionFindMany.mockResolvedValueOnce([
      { traineeId: TRAINEE_ID },
      { traineeId: TRAINEE_ID },
    ]);

    const res = await request(app)
      .get('/trainer/trainees')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.trainees).toHaveLength(2);

    const active = res.body.data.trainees[0];
    expect(active.traineeId).toBe(TRAINEE_ID);
    expect(active.email).toBe('trainee@example.com');
    expect(active.status).toBe('active');
    expect(active.lastSessionAt).toBe('2024-06-01T10:00:00.000Z');
    expect(active.unreadRedAlertCount).toBe(2);

    const pending = res.body.data.trainees[1];
    expect(pending.traineeId).toBeNull();
    expect(pending.email).toBe('pending@example.com');
    expect(pending.status).toBe('pending');
    expect(pending.lastSessionAt).toBeNull();
    expect(pending.unreadRedAlertCount).toBe(0);
  });

  it('200 — returns empty array when trainer has no trainees', async () => {
    mockLinkFindMany.mockResolvedValueOnce([]);
    // activeTraineeIds is empty so no batch queries fire; no findMany mocks needed

    const res = await request(app)
      .get('/trainer/trainees')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.trainees).toEqual([]);
    expect(mockSessionFindMany).not.toHaveBeenCalled();
  });

  it('200 — active trainee with no sessions shows null lastSessionAt', async () => {
    mockLinkFindMany.mockResolvedValueOnce([mockActiveLinkRecord]);
    mockSessionFindMany.mockResolvedValueOnce([]); // no last sessions
    mockSessionFindMany.mockResolvedValueOnce([]); // no unread red

    const res = await request(app)
      .get('/trainer/trainees')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    const trainee = res.body.data.trainees[0];
    expect(trainee.lastSessionAt).toBeNull();
    expect(trainee.unreadRedAlertCount).toBe(0);
  });

  it('200 — only one lastSession per trainee (most recent)', async () => {
    mockLinkFindMany.mockResolvedValueOnce([mockActiveLinkRecord]);
    mockSessionFindMany.mockResolvedValueOnce([
      { traineeId: TRAINEE_ID, startedAt: new Date('2024-06-02T10:00:00Z') },
      { traineeId: TRAINEE_ID, startedAt: new Date('2024-06-01T10:00:00Z') },
    ]);
    mockSessionFindMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/trainer/trainees')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    // Should take only the first (most recent) session
    expect(res.body.data.trainees[0].lastSessionAt).toBe('2024-06-02T10:00:00.000Z');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/trainer/trainees');
    expect(res.status).toBe(401);
  });

  it('403 — trainee cannot access trainer routes', async () => {
    const res = await request(app)
      .get('/trainer/trainees')
      .set('Authorization', `Bearer ${traineeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// GET /trainer/trainees/:traineeId/sessions
// ---------------------------------------------------------------------------
describe('GET /trainer/trainees/:traineeId/sessions', () => {
  it('200 — returns paginated sessions for linked trainee', async () => {
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);
    mockSessionFindMany.mockResolvedValueOnce([mockSessionRecord, mockEndedSessionRecord]);
    mockSessionCount.mockResolvedValueOnce(2);

    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toHaveLength(2);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(20);
    expect(res.body.data.pagination.total).toBe(2);
    expect(mockLinkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trainerId: TRAINER_ID, traineeId: TRAINEE_ID, status: 'active' },
      }),
    );
  });

  it('200 — respects custom page and limit query params', async () => {
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);
    mockSessionFindMany.mockResolvedValueOnce([mockEndedSessionRecord]);
    mockSessionCount.mockResolvedValueOnce(10);

    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions?page=2&limit=5`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(2);
    expect(res.body.data.pagination.limit).toBe(5);
    expect(res.body.data.pagination.total).toBe(10);
    expect(mockSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
  });

  it('200 — returns empty sessions array when trainee has no sessions', async () => {
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);
    mockSessionFindMany.mockResolvedValueOnce([]);
    mockSessionCount.mockResolvedValueOnce(0);

    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('403 — trainer not linked to trainee', async () => {
    mockLinkFindFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get(`/trainer/trainees/${TRAINEE_ID}/sessions`);
    expect(res.status).toBe(401);
  });

  it('403 — trainee cannot access trainer routes', async () => {
    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions`)
      .set('Authorization', `Bearer ${traineeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — invalid traineeId UUID in path', async () => {
    const res = await request(app)
      .get('/trainer/trainees/not-a-uuid/sessions')
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — page must be a positive integer', async () => {
    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions?page=0`)
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — limit must not exceed 100', async () => {
    const res = await request(app)
      .get(`/trainer/trainees/${TRAINEE_ID}/sessions?limit=200`)
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// GET /trainer/sessions/:sessionId
// ---------------------------------------------------------------------------
describe('GET /trainer/sessions/:sessionId', () => {
  const mockSessionFull = {
    ...mockSessionRecord,
    sets: [
      {
        ...mockSetRecord,
        formScore: mockFormScoreRecord,
      },
    ],
  };

  it('200 — returns session with sets and form scores', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionFull);
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);

    const res = await request(app)
      .get(`/trainer/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(SESSION_ID);
    expect(res.body.data.session.traineeId).toBe(TRAINEE_ID);
    expect(res.body.data.session.sets).toHaveLength(1);
    expect(res.body.data.session.sets[0].exerciseName).toBe('squat');
    expect(res.body.data.session.sets[0].weightKg).toBe(80);
    expect(res.body.data.session.sets[0].formScore.scoreTier).toBe('red');
    expect(res.body.data.session.sets[0].formScore.confidenceLevel).toBe(0.88);
    expect(mockLinkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trainerId: TRAINER_ID, traineeId: TRAINEE_ID, status: 'active' },
      }),
    );
  });

  it('200 — set with no form score returns null formScore', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({
      ...mockSessionFull,
      sets: [{ ...mockSetRecord, formScore: null }],
    });
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);

    const res = await request(app)
      .get(`/trainer/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.sets[0].formScore).toBeNull();
  });

  it('200 — set with null weightKg serializes correctly', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({
      ...mockSessionFull,
      sets: [{ ...mockSetRecord, weightKg: null, formScore: null }],
    });
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);

    const res = await request(app)
      .get(`/trainer/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.sets[0].weightKg).toBeNull();
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/trainer/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('403 — trainer not linked to session owner', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionFull);
    mockLinkFindFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/trainer/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get(`/trainer/sessions/${SESSION_ID}`);
    expect(res.status).toBe(401);
  });

  it('403 — trainee cannot access trainer routes', async () => {
    const res = await request(app)
      .get(`/trainer/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — invalid UUID in path', async () => {
    const res = await request(app)
      .get('/trainer/sessions/not-a-uuid')
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// PATCH /trainer/sessions/:sessionId/read
// ---------------------------------------------------------------------------
describe('PATCH /trainer/sessions/:sessionId/read', () => {
  it('200 — marks session as read for the trainer', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);
    mockSessionReadUpsert.mockResolvedValueOnce(mockSessionReadRecord);

    const res = await request(app)
      .patch(`/trainer/sessions/${SESSION_ID}/read`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionRead.trainerId).toBe(TRAINER_ID);
    expect(res.body.data.sessionRead.sessionId).toBe(SESSION_ID);
    expect(res.body.data.sessionRead.readAt).toBe('2024-06-01T12:00:00.000Z');
    expect(mockSessionReadUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trainerId_sessionId: { trainerId: TRAINER_ID, sessionId: SESSION_ID } },
        create: { trainerId: TRAINER_ID, sessionId: SESSION_ID },
        update: {},
      }),
    );
  });

  it('200 — idempotent: marking already-read session returns same record', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockLinkFindFirst.mockResolvedValueOnce(mockActiveLinkRecord);
    mockSessionReadUpsert.mockResolvedValueOnce(mockSessionReadRecord);

    const res = await request(app)
      .patch(`/trainer/sessions/${SESSION_ID}/read`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionRead.sessionId).toBe(SESSION_ID);
    expect(mockSessionReadUpsert).toHaveBeenCalledTimes(1);
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/trainer/sessions/${SESSION_ID}/read`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('403 — trainer not linked to session owner', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockLinkFindFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/trainer/sessions/${SESSION_ID}/read`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).patch(`/trainer/sessions/${SESSION_ID}/read`);
    expect(res.status).toBe(401);
  });

  it('403 — trainee cannot mark sessions as read', async () => {
    const res = await request(app)
      .patch(`/trainer/sessions/${SESSION_ID}/read`)
      .set('Authorization', `Bearer ${traineeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — invalid UUID in path', async () => {
    const res = await request(app)
      .patch('/trainer/sessions/not-a-uuid/read')
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
