import type { Session, SessionSet, FormScore } from '@boost/shared';

export function serializeSession(s: {
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

export function serializeSet(s: {
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

export function serializeFormScore(f: {
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
