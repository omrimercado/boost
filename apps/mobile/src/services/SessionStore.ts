import { MMKV } from 'react-native-mmkv';
import type { ExerciseName } from '@boost/shared';

const storage = new MMKV();

const ACTIVE_SESSION_KEY = 'session:active';
const SYNC_QUEUE_KEY = 'sync:queue';

export interface LocalSet {
  id: string;
  exerciseName: ExerciseName;
  weightKg: number | null;
  reps: number;
  setNumber: number;
  loggedAt: string;
}

export interface LocalSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  exerciseName: ExerciseName | null;
  sets: LocalSet[];
}

export type SyncItemType = 'session' | 'set' | 'end_session';

export interface SyncQueueItem {
  type: SyncItemType;
  sessionId: string;
  setId?: string;
  payload: Record<string, unknown>;
}

export function saveActiveSession(session: LocalSession): void {
  storage.set(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function loadActiveSession(): LocalSession | null {
  const raw = storage.getString(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  storage.delete(ACTIVE_SESSION_KEY);
}

export function addToPendingQueue(item: SyncQueueItem): void {
  const queue = loadPendingQueue();
  queue.push(item);
  storage.set(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function loadPendingQueue(): SyncQueueItem[] {
  const raw = storage.getString(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncQueueItem[];
  } catch {
    return [];
  }
}

export function clearSyncQueue(): void {
  storage.delete(SYNC_QUEUE_KEY);
}
