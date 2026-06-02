/// <reference types="jest" />
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('dotenv/config', () => ({}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    set: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    formScore: {
      create: jest.fn(),
    },
    trainerTrainee: {
      findFirst: jest.fn(),
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

const mockSessionFindUnique = prisma.session.findUnique as jest.Mock;
const mockSessionFindMany = prisma.session.findMany as jest.Mock;
const mockSessionCreate = prisma.session.create as jest.Mock;
const mockSessionUpdate = prisma.session.update as jest.Mock;
const mockSetFindUnique = prisma.set.findUnique as jest.Mock;
const mockSetCreate = prisma.set.create as jest.Mock;
const mockFormScoreCreate = prisma.formScore.create as jest.Mock;
const mockLinkFindFirst = prisma.trainerTrainee.findFirst as jest.Mock;
const mockRedisExists = redisService.exists as jest.Mock;

const ACCESS_SECRET = 'test_access_secret_long_enough_32chars';
const REFRESH_SECRET = 'test_refresh_secret_long_enough_32ch';

const TRAINER_ID = '11111111-1111-4111-a111-111111111111';
const TRAINEE_ID = '22222222-2222-4222-a222-222222222222';
const OTHER_TRAINEE_ID = '33333333-3333-4333-a333-333333333333';
const SESSION_ID = '44444444-4444-4444-a444-444444444444';
const SET_ID = '55555555-5555-4555-a555-555555555555';
const FORM_SCORE_ID = '66666666-6666-4666-a666-666666666666';
const LINK_ID = '77777777-7777-4777-a777-777777777777';

function makeToken(sub: string, role: 'trainer' | 'trainee'): string {
  return jwt.sign({ sub, role }, ACCESS_SECRET, { expiresIn: '15m' });
}

const traineeToken = makeToken(TRAINEE_ID, 'trainee');
const trainerToken = makeToken(TRAINER_ID, 'trainer');

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
  scoreTier: 'green',
  coachingText: 'Great form!',
  angleData: { knee: { min: 90, max: 120, avg: 105, deviationCount: 2 } },
  confidenceLevel: { toNumber: () => 0.95 },
  createdAt: new Date('2024-06-01T10:11:00Z'),
};

const mockLinkRecord = {
  id: LINK_ID,
  trainerId: TRAINER_ID,
  traineeId: TRAINEE_ID,
  status: 'active',
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
// POST /sessions
// ---------------------------------------------------------------------------
describe('POST /sessions', () => {
  it('201 — creates a new session for trainee', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);
    mockSessionCreate.mockResolvedValueOnce(mockSessionRecord);

    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SESSION_ID, startedAt: '2024-06-01T10:00:00Z' });

    expect(res.status).toBe(201);
    expect(res.body.data.session.id).toBe(SESSION_ID);
    expect(res.body.data.session.traineeId).toBe(TRAINEE_ID);
    expect(res.body.data.session.endedAt).toBeNull();
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
  });

  it('200 — idempotent: returns existing session if same id and same trainee', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);

    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SESSION_ID, startedAt: '2024-06-01T10:00:00Z' });

    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(SESSION_ID);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('403 — session id belongs to different trainee', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({ ...mockSessionRecord, traineeId: OTHER_TRAINEE_ID });

    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SESSION_ID, startedAt: '2024-06-01T10:00:00Z' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({ id: SESSION_ID, startedAt: '2024-06-01T10:00:00Z' });
    expect(res.status).toBe(401);
  });

  it('403 — trainer cannot create sessions', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ id: SESSION_ID, startedAt: '2024-06-01T10:00:00Z' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — missing id', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ startedAt: '2024-06-01T10:00:00Z' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid UUID id', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: 'not-a-uuid', startedAt: '2024-06-01T10:00:00Z' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing startedAt', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SESSION_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid startedAt date', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SESSION_ID, startedAt: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// PATCH /sessions/:id
// ---------------------------------------------------------------------------
describe('PATCH /sessions/:id', () => {
  it('200 — ends an open session', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockSessionUpdate.mockResolvedValueOnce(mockEndedSessionRecord);

    const res = await request(app)
      .patch(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.endedAt).not.toBeNull();
    expect(mockSessionUpdate).toHaveBeenCalledTimes(1);
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('403 — session belongs to different trainee', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({ ...mockSessionRecord, traineeId: OTHER_TRAINEE_ID });

    const res = await request(app)
      .patch(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('409 — session already ended', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockEndedSessionRecord);

    const res = await request(app)
      .patch(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SESSION_ALREADY_ENDED');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).patch(`/api/v1/sessions/${SESSION_ID}`);
    expect(res.status).toBe(401);
  });

  it('403 — trainer cannot end sessions', async () => {
    const res = await request(app)
      .patch(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — invalid UUID in params', async () => {
    const res = await request(app)
      .patch('/api/v1/sessions/not-a-uuid')
      .set('Authorization', `Bearer ${traineeToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /sessions/:id/sets
// ---------------------------------------------------------------------------
describe('POST /sessions/:id/sets', () => {
  const validSetBody = {
    id: SET_ID,
    exerciseName: 'squat',
    reps: 5,
    setNumber: 1,
    weightKg: 80,
  };

  it('201 — creates a set for an owned session', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockSetFindUnique.mockResolvedValueOnce(null);
    mockSetCreate.mockResolvedValueOnce(mockSetRecord);

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validSetBody);

    expect(res.status).toBe(201);
    expect(res.body.data.set.id).toBe(SET_ID);
    expect(res.body.data.set.exerciseName).toBe('squat');
    expect(res.body.data.set.weightKg).toBe(80);
    expect(mockSetCreate).toHaveBeenCalledTimes(1);
  });

  it('200 — idempotent: returns existing set if same id and same session', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockSetFindUnique.mockResolvedValueOnce(mockSetRecord);

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validSetBody);

    expect(res.status).toBe(200);
    expect(res.body.data.set.id).toBe(SET_ID);
    expect(mockSetCreate).not.toHaveBeenCalled();
  });

  it('409 SET_ID_CONFLICT — set id already used in a different session', async () => {
    const differentSessionId = '88888888-8888-4888-a888-888888888888';
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockSetFindUnique.mockResolvedValueOnce({ ...mockSetRecord, sessionId: differentSessionId });

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validSetBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SET_ID_CONFLICT');
    expect(mockSetCreate).not.toHaveBeenCalled();
  });

  it('201 — creates set without optional weightKg', async () => {
    const setWithoutWeight = { ...mockSetRecord, weightKg: null };
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockSetFindUnique.mockResolvedValueOnce(null);
    mockSetCreate.mockResolvedValueOnce(setWithoutWeight);

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SET_ID, exerciseName: 'squat', reps: 5, setNumber: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.set.weightKg).toBeNull();
  });

  it('201 — creates set with explicit loggedAt', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionRecord);
    mockSetFindUnique.mockResolvedValueOnce(null);
    mockSetCreate.mockResolvedValueOnce(mockSetRecord);

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ id: SET_ID, exerciseName: 'squat', reps: 5, setNumber: 1, loggedAt: '2024-06-01T10:10:00Z' });

    expect(res.status).toBe(201);
    expect(mockSetCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ loggedAt: new Date('2024-06-01T10:10:00Z') }) }),
    );
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validSetBody);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('403 — session belongs to different trainee', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({ ...mockSessionRecord, traineeId: OTHER_TRAINEE_ID });

    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validSetBody);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .send(validSetBody);
    expect(res.status).toBe(401);
  });

  it('403 — trainer cannot create sets', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send(validSetBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — missing set id', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ exerciseName: 'squat', reps: 5, setNumber: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid exerciseName', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ ...validSetBody, exerciseName: 'invalid_exercise' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — reps must be positive integer', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ ...validSetBody, reps: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — setNumber must be positive integer', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${SESSION_ID}/sets`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ ...validSetBody, setNumber: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid session UUID in path', async () => {
    const res = await request(app)
      .post('/api/v1/sessions/not-a-uuid/sets')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validSetBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /sets/:id/form-score
// ---------------------------------------------------------------------------
describe('POST /sets/:id/form-score', () => {
  const validFormScoreBody = {
    scoreTier: 'green',
    coachingText: 'Great form!',
    angleData: { knee: { min: 90, max: 120, avg: 105, deviationCount: 2 } },
    confidenceLevel: 0.95,
  };

  const mockSetWithSession = {
    ...mockSetRecord,
    session: { ...mockSessionRecord },
    formScore: null,
  };

  it('201 — attaches form score to owned set', async () => {
    mockSetFindUnique.mockResolvedValueOnce(mockSetWithSession);
    mockFormScoreCreate.mockResolvedValueOnce(mockFormScoreRecord);

    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validFormScoreBody);

    expect(res.status).toBe(201);
    expect(res.body.data.formScore.scoreTier).toBe('green');
    expect(res.body.data.formScore.coachingText).toBe('Great form!');
    expect(res.body.data.formScore.confidenceLevel).toBe(0.95);
    expect(mockFormScoreCreate).toHaveBeenCalledTimes(1);
  });

  it('201 — attaches form score without optional confidenceLevel', async () => {
    const formScoreWithoutConfidence = { ...mockFormScoreRecord, confidenceLevel: null };
    mockSetFindUnique.mockResolvedValueOnce(mockSetWithSession);
    mockFormScoreCreate.mockResolvedValueOnce(formScoreWithoutConfidence);

    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ scoreTier: 'red', coachingText: 'Needs improvement', angleData: {} });

    expect(res.status).toBe(201);
    expect(res.body.data.formScore.confidenceLevel).toBeNull();
  });

  it('404 — set not found', async () => {
    mockSetFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validFormScoreBody);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('403 — set belongs to different trainee', async () => {
    mockSetFindUnique.mockResolvedValueOnce({
      ...mockSetWithSession,
      session: { ...mockSessionRecord, traineeId: OTHER_TRAINEE_ID },
    });

    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validFormScoreBody);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('409 — form score already exists for this set', async () => {
    mockSetFindUnique.mockResolvedValueOnce({
      ...mockSetWithSession,
      formScore: mockFormScoreRecord,
    });

    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validFormScoreBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('FORM_SCORE_EXISTS');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .send(validFormScoreBody);
    expect(res.status).toBe(401);
  });

  it('403 — trainer cannot add form scores', async () => {
    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send(validFormScoreBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('400 — invalid scoreTier', async () => {
    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ ...validFormScoreBody, scoreTier: 'blue' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing coachingText', async () => {
    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ scoreTier: 'green', angleData: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — missing angleData', async () => {
    const res = await request(app)
      .post(`/api/v1/sets/${SET_ID}/form-score`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ scoreTier: 'green', coachingText: 'ok' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid UUID in params', async () => {
    const res = await request(app)
      .post('/api/v1/sets/not-a-uuid/form-score')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send(validFormScoreBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// GET /sessions
// ---------------------------------------------------------------------------
describe('GET /sessions', () => {
  it('200 — trainee gets own sessions', async () => {
    mockSessionFindMany.mockResolvedValueOnce([mockSessionRecord]);

    const res = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toHaveLength(1);
    expect(res.body.data.sessions[0].traineeId).toBe(TRAINEE_ID);
    expect(mockSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { traineeId: TRAINEE_ID } }),
    );
  });

  it('200 — trainee with no sessions returns empty array', async () => {
    mockSessionFindMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toEqual([]);
  });

  it('200 — trainer gets sessions for linked trainee', async () => {
    mockLinkFindFirst.mockResolvedValueOnce(mockLinkRecord);
    mockSessionFindMany.mockResolvedValueOnce([mockSessionRecord]);

    const res = await request(app)
      .get(`/api/v1/sessions?traineeId=${TRAINEE_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toHaveLength(1);
    expect(mockLinkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trainerId: TRAINER_ID, traineeId: TRAINEE_ID, status: 'active' },
      }),
    );
  });

  it('400 — trainer without traineeId query param', async () => {
    const res = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('403 — trainer not linked to trainee', async () => {
    mockLinkFindFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/v1/sessions?traineeId=${TRAINEE_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/v1/sessions');
    expect(res.status).toBe(401);
  });

  it('400 — invalid traineeId UUID format', async () => {
    const res = await request(app)
      .get('/api/v1/sessions?traineeId=not-a-uuid')
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// GET /sessions/:id
// ---------------------------------------------------------------------------
describe('GET /sessions/:id', () => {
  const mockSessionFull = {
    ...mockSessionRecord,
    sets: [
      {
        ...mockSetRecord,
        formScore: mockFormScoreRecord,
      },
    ],
  };

  it('200 — trainee gets own session with sets and form scores', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionFull);

    const res = await request(app)
      .get(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(SESSION_ID);
    expect(res.body.data.session.sets).toHaveLength(1);
    expect(res.body.data.session.sets[0].exerciseName).toBe('squat');
    expect(res.body.data.session.sets[0].formScore.scoreTier).toBe('green');
  });

  it('200 — trainee gets session with set that has no form score', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({
      ...mockSessionFull,
      sets: [{ ...mockSetRecord, formScore: null }],
    });

    const res = await request(app)
      .get(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.sets[0].formScore).toBeNull();
  });

  it('200 — trainer gets session for linked trainee', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionFull);
    mockLinkFindFirst.mockResolvedValueOnce(mockLinkRecord);

    const res = await request(app)
      .get(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(SESSION_ID);
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('403 — trainee accessing another trainee session', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({ ...mockSessionFull, traineeId: OTHER_TRAINEE_ID });

    const res = await request(app)
      .get(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${traineeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('403 — trainer not linked to session owner', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSessionFull);
    mockLinkFindFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/v1/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get(`/api/v1/sessions/${SESSION_ID}`);
    expect(res.status).toBe(401);
  });

  it('400 — invalid UUID in params', async () => {
    const res = await request(app)
      .get('/api/v1/sessions/not-a-uuid')
      .set('Authorization', `Bearer ${traineeToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
