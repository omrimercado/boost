import type { ExerciseName } from './types';

export const EXERCISE_NAMES: ExerciseName[] = [
  'squat',
  'deadlift',
  'bench_press',
  'overhead_press',
  'barbell_row',
  'pull_up',
  'lunge',
];

export const ACCESS_TOKEN_TTL_MINUTES = 15;
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const RESET_TOKEN_TTL_HOURS = 1;
export const INVITE_TOKEN_TTL_DAYS = 7;

export const FORM_ANALYSIS_TIMEOUT_MS = 5000;
