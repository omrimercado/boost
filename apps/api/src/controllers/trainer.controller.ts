import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import { serializeSession, serializeSet, serializeFormScore } from '../lib/serializers';

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

export const trainerController = {
  async getTrainees(req: AuthRequest, res: Response): Promise<void> {
    const trainerId = req.user!.id;

    const links = await prisma.trainerTrainee.findMany({
      where: { trainerId },
      include: {
        trainee: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeTraineeIds = links
      .filter((l) => l.status === 'active' && l.traineeId != null)
      .map((l) => l.traineeId as string);

    // Two parallel batch queries to avoid N+1 per trainee.
    // lastSessions is ordered DESC globally; the Map takes the first entry per trainee,
    // which is always the most recent because Postgres returns rows in that order.
    const [lastSessions, unreadRedSessions] = await Promise.all([
      activeTraineeIds.length > 0
        ? prisma.session.findMany({
            where: { traineeId: { in: activeTraineeIds } },
            orderBy: { startedAt: 'desc' },
            select: { traineeId: true, startedAt: true },
          })
        : Promise.resolve([]),
      activeTraineeIds.length > 0
        ? prisma.session.findMany({
            where: {
              traineeId: { in: activeTraineeIds },
              sets: { some: { formScore: { scoreTier: 'red' } } },
              sessionReads: { none: { trainerId } },
            },
            select: { traineeId: true },
          })
        : Promise.resolve([]),
    ]);

    const lastSessionMap = new Map<string, string>();
    for (const s of lastSessions) {
      if (!lastSessionMap.has(s.traineeId)) {
        lastSessionMap.set(s.traineeId, s.startedAt.toISOString());
      }
    }

    const unreadRedCountMap = new Map<string, number>();
    for (const s of unreadRedSessions) {
      unreadRedCountMap.set(s.traineeId, (unreadRedCountMap.get(s.traineeId) ?? 0) + 1);
    }

    const trainees = links.map((link) => ({
      linkId: link.id,
      traineeId: link.traineeId ?? null,
      email: link.trainee?.email ?? link.inviteEmail,
      status: link.status,
      lastSessionAt: link.traineeId ? (lastSessionMap.get(link.traineeId) ?? null) : null,
      unreadRedAlertCount: link.traineeId ? (unreadRedCountMap.get(link.traineeId) ?? 0) : 0,
    }));

    res.status(200).json({ data: { trainees } });
  },

  async getTraineeSessions(req: AuthRequest, res: Response): Promise<void> {
    const trainerId = req.user!.id;
    const { traineeId } = req.params as { traineeId: string };
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const link = await prisma.trainerTrainee.findFirst({
      where: { trainerId, traineeId, status: 'active' },
    });
    if (!link) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not linked to this trainee' });
      return;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { traineeId },
        orderBy: { startedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.session.count({ where: { traineeId } }),
    ]);

    res.status(200).json({
      data: {
        sessions: sessions.map(serializeSession),
        pagination: { page: pageNum, limit: limitNum, total },
      },
    });
  },

  async getSessionById(req: AuthRequest, res: Response): Promise<void> {
    const trainerId = req.user!.id;
    const { sessionId } = req.params as { sessionId: string };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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

    const link = await prisma.trainerTrainee.findFirst({
      where: { trainerId, traineeId: session.traineeId, status: 'active' },
    });
    if (!link) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not linked to the trainee who owns this session' });
      return;
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

  async markSessionRead(req: AuthRequest, res: Response): Promise<void> {
    const trainerId = req.user!.id;
    const { sessionId } = req.params as { sessionId: string };

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }

    const link = await prisma.trainerTrainee.findFirst({
      where: { trainerId, traineeId: session.traineeId, status: 'active' },
    });
    if (!link) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Not linked to the trainee who owns this session' });
      return;
    }

    // upsert with update:{} preserves the original readAt on repeated calls
    const sessionRead = await prisma.sessionRead.upsert({
      where: { trainerId_sessionId: { trainerId, sessionId } },
      create: { trainerId, sessionId },
      update: {},
    });

    res.status(200).json({
      data: {
        sessionRead: {
          trainerId: sessionRead.trainerId,
          sessionId: sessionRead.sessionId,
          readAt: sessionRead.readAt.toISOString(),
        },
      },
    });
  },
};
