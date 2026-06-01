import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { Session, SessionSet, FormScore } from '@boost/shared';

type SetWithFormScore = {
  id: string;
  sessionId: string;
  exerciseName: string;
  weightKg: { toNumber(): number } | null;
  reps: number;
  setNumber: number;
  loggedAt: Date;
  formScore: {
    id: string;
    setId: string;
    scoreTier: string;
    coachingText: string;
    angleData: unknown;
    confidenceLevel: { toNumber(): number } | null;
    createdAt: Date;
  } | null;
};

function serializeSession(s: {
  id: string;
  traineeId: string;
  startedAt: Date;
  endedAt: Date | null;
}): Session {
  return {
    id: s.id,
    traineeId: s.traineeId,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
  };
}

function serializeSet(s: {
  id: string;
  sessionId: string;
  exerciseName: string;
  weightKg: { toNumber(): number } | null;
  reps: number;
  setNumber: number;
  loggedAt: Date;
}): SessionSet {
  return {
    id: s.id,
    sessionId: s.sessionId,
    exerciseName: s.exerciseName as SessionSet['exerciseName'],
    weightKg: s.weightKg ? s.weightKg.toNumber() : null,
    reps: s.reps,
    setNumber: s.setNumber,
    loggedAt: s.loggedAt.toISOString(),
  };
}

function serializeFormScore(f: {
  id: string;
  setId: string;
  scoreTier: string;
  coachingText: string;
  angleData: unknown;
  confidenceLevel: { toNumber(): number } | null;
  createdAt: Date;
}): FormScore {
  return {
    id: f.id,
    setId: f.setId,
    scoreTier: f.scoreTier as FormScore['scoreTier'],
    coachingText: f.coachingText,
    angleData: f.angleData as FormScore['angleData'],
    confidenceLevel: f.confidenceLevel ? f.confidenceLevel.toNumber() : null,
    createdAt: f.createdAt.toISOString(),
  };
}

export const sessionController = {
  async createSession(req: AuthRequest, res: Response): Promise<void> {
    const traineeId = req.user!.id;
    const { id, startedAt } = req.body as { id: string; startedAt: string };

    const existing = await prisma.session.findUnique({ where: { id } });
    if (existing) {
      if (existing.traineeId !== traineeId) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Session belongs to a different trainee' });
        return;
      }
      res.status(200).json({ data: { session: serializeSession(existing) } });
      return;
    }

    const session = await prisma.session.create({
      data: { id, traineeId, startedAt: new Date(startedAt) },
    });

    res.status(201).json({ data: { session: serializeSession(session) } });
  },

  async endSession(req: AuthRequest, res: Response): Promise<void> {
    const traineeId = req.user!.id;
    const { id } = req.params as { id: string };

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    if (session.traineeId !== traineeId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Session belongs to a different trainee' });
      return;
    }
    if (session.endedAt) {
      res.status(409).json({ error: 'SESSION_ALREADY_ENDED', message: 'Session has already been ended' });
      return;
    }

    const updated = await prisma.session.update({
      where: { id },
      data: { endedAt: new Date() },
    });

    res.status(200).json({ data: { session: serializeSession(updated) } });
  },

  async createSet(req: AuthRequest, res: Response): Promise<void> {
    const traineeId = req.user!.id;
    const { id: sessionId } = req.params as { id: string };
    const { id, exerciseName, weightKg, reps, setNumber, loggedAt } = req.body as {
      id: string;
      exerciseName: string;
      weightKg?: number;
      reps: number;
      setNumber: number;
      loggedAt?: string;
    };

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    if (session.traineeId !== traineeId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Session belongs to a different trainee' });
      return;
    }

    const existing = await prisma.set.findUnique({ where: { id } });
    if (existing) {
      if (existing.sessionId !== sessionId) {
        res.status(409).json({ error: 'SET_ID_CONFLICT', message: 'Set id is already used in a different session' });
        return;
      }
      res.status(200).json({ data: { set: serializeSet(existing) } });
      return;
    }

    const set = await prisma.set.create({
      data: {
        id,
        sessionId,
        exerciseName,
        weightKg: weightKg !== undefined ? weightKg : null,
        reps,
        setNumber,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    res.status(201).json({ data: { set: serializeSet(set) } });
  },

  async createFormScore(req: AuthRequest, res: Response): Promise<void> {
    const traineeId = req.user!.id;
    const { id: setId } = req.params as { id: string };
    const { scoreTier, coachingText, angleData, confidenceLevel } = req.body as {
      scoreTier: string;
      coachingText: string;
      angleData: object;
      confidenceLevel?: number;
    };

    const set = await prisma.set.findUnique({
      where: { id: setId },
      include: { session: true, formScore: true },
    });
    if (!set) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Set not found' });
      return;
    }
    if (set.session.traineeId !== traineeId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Set belongs to a different trainee' });
      return;
    }
    if (set.formScore) {
      res.status(409).json({ error: 'FORM_SCORE_EXISTS', message: 'A form score already exists for this set' });
      return;
    }

    const formScore = await prisma.formScore.create({
      data: {
        setId,
        scoreTier: scoreTier as 'green' | 'yellow' | 'red',
        coachingText,
        angleData,
        confidenceLevel: confidenceLevel !== undefined ? confidenceLevel : null,
      },
    });

    res.status(201).json({ data: { formScore: serializeFormScore(formScore) } });
  },

  async getSessions(req: AuthRequest, res: Response): Promise<void> {
    const user = req.user!;

    if (user.role === 'trainee') {
      const sessions = await prisma.session.findMany({
        where: { traineeId: user.id },
        orderBy: { startedAt: 'desc' },
      });
      res.status(200).json({ data: { sessions: sessions.map(serializeSession) } });
      return;
    }

    // Trainer: traineeId is required
    const { traineeId } = req.query as { traineeId?: string };
    if (!traineeId) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'traineeId query param is required for trainers' });
      return;
    }

    const link = await prisma.trainerTrainee.findFirst({
      where: { trainerId: user.id, traineeId, status: 'active' },
    });
    if (!link) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not linked to this trainee' });
      return;
    }

    const sessions = await prisma.session.findMany({
      where: { traineeId },
      orderBy: { startedAt: 'desc' },
    });
    res.status(200).json({ data: { sessions: sessions.map(serializeSession) } });
  },

  async getSessionById(req: AuthRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params as { id: string };

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        sets: {
          include: { formScore: true },
          orderBy: { setNumber: 'asc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }

    if (user.role === 'trainee') {
      if (session.traineeId !== user.id) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Session belongs to a different trainee' });
        return;
      }
    } else {
      const link = await prisma.trainerTrainee.findFirst({
        where: { trainerId: user.id, traineeId: session.traineeId, status: 'active' },
      });
      if (!link) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Not linked to the trainee who owns this session' });
        return;
      }
    }

    const serialized = {
      ...serializeSession(session),
      sets: session.sets.map((s: SetWithFormScore) => ({
        ...serializeSet(s),
        formScore: s.formScore ? serializeFormScore(s.formScore) : null,
      })),
    };

    res.status(200).json({ data: { session: serialized } });
  },
};
