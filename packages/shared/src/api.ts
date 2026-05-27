import type { User, Session, SessionSet, FormScore, UserRole, ExerciseName, ScoreTier } from './types';

// Auth
export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Invites
export interface SendInviteRequest {
  email: string;
}

export interface InviteInfoResponse {
  trainerName: string;
  inviteEmail: string;
}

export interface AcceptInviteRequest {
  password: string;
}

// Sessions
export interface CreateSessionRequest {
  id: string;
  startedAt: string;
}

export interface EndSessionRequest {
  endedAt: string;
}

export interface SessionListItem {
  id: string;
  startedAt: string;
  endedAt: string | null;
  setCount: number;
  scoreSummary: {
    green: number;
    yellow: number;
    red: number;
  };
}

export interface SessionDetail extends Session {
  sets: (SessionSet & { formScore: FormScore | null })[];
}

// Sets
export interface CreateSetRequest {
  id: string;
  exerciseName: ExerciseName;
  weightKg: number | null;
  reps: number;
  setNumber: number;
  loggedAt: string;
}

export interface CreateFormScoreRequest {
  scoreTier: ScoreTier;
  coachingText: string;
  angleData: Record<string, { min: number; max: number; avg: number; deviationCount: number }>;
  confidenceLevel: number | null;
}

// Trainer
export interface TraineeListItem {
  id: string;
  email: string;
  status: 'pending' | 'active';
  lastSessionAt: string | null;
  unreadRedCount: number;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
}
