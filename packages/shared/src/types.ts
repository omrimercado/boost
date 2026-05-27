export type UserRole = 'trainer' | 'trainee';

export type ScoreTier = 'green' | 'yellow' | 'red';

export type InviteStatus = 'pending' | 'active';

export type ExerciseName =
  | 'squat'
  | 'deadlift'
  | 'bench_press'
  | 'overhead_press'
  | 'barbell_row'
  | 'pull_up'
  | 'lunge';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Session {
  id: string;
  traineeId: string;
  startedAt: string;
  endedAt: string | null;
}

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseName: ExerciseName;
  weightKg: number | null;
  reps: number;
  setNumber: number;
  loggedAt: string;
}

export interface FormScore {
  id: string;
  setId: string;
  scoreTier: ScoreTier;
  coachingText: string;
  angleData: AngleData;
  confidenceLevel: number | null;
  createdAt: string;
}

export interface AngleData {
  [joint: string]: {
    min: number;
    max: number;
    avg: number;
    deviationCount: number;
  };
}
