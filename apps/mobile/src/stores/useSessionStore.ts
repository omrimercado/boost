import { create } from 'zustand';
import type { ExerciseName } from '@boost/shared';
import { apiClient } from '../services/api';
import {
  saveActiveSession,
  loadActiveSession,
  clearActiveSession,
  addToPendingQueue,
  loadPendingQueue,
  clearSyncQueue,
  type LocalSession,
  type LocalSet,
  type AngleSummaryEntry,
} from '../services/SessionStore';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface SessionState {
  activeSession: LocalSession | null;
  completedSession: LocalSession | null;
  isSyncing: boolean;
  pendingAngleData: Record<string, AngleSummaryEntry> | null;
  pendingPoseConfidence: number | null;
  initFromStorage: () => void;
  startSession: (id: string) => void;
  setExercise: (name: ExerciseName) => void;
  setPendingAngleData: (
    angleData: Record<string, AngleSummaryEntry>,
    confidence: number
  ) => void;
  clearPendingAngleData: () => void;
  addSet: (data: {
    exerciseName: ExerciseName;
    weightKg: number | null;
    reps: number;
    setNumber: number;
  }) => void;
  endSession: () => Promise<void>;
  syncPending: () => Promise<void>;
  discardSession: () => void;
  clearCompletedSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  completedSession: null,
  isSyncing: false,
  pendingAngleData: null,
  pendingPoseConfidence: null,

  initFromStorage: () => {
    const session = loadActiveSession();
    set({ activeSession: session });
  },

  startSession: (id: string) => {
    const now = new Date().toISOString();
    const session: LocalSession = {
      id,
      startedAt: now,
      endedAt: null,
      exerciseName: null,
      sets: [],
    };
    saveActiveSession(session);
    addToPendingQueue({
      type: 'session',
      sessionId: id,
      payload: { id, startedAt: now },
    });
    set({ activeSession: session });
  },

  setPendingAngleData: (angleData, confidence) => {
    set({ pendingAngleData: angleData, pendingPoseConfidence: confidence });
  },

  clearPendingAngleData: () => {
    set({ pendingAngleData: null, pendingPoseConfidence: null });
  },

  setExercise: (name: ExerciseName) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const updated = { ...activeSession, exerciseName: name };
    saveActiveSession(updated);
    set({ activeSession: updated });
  },

  addSet: ({ exerciseName, weightKg, reps, setNumber }) => {
    const { activeSession, pendingAngleData, pendingPoseConfidence } = get();
    if (!activeSession) return;
    const newSet: LocalSet = {
      id: generateId(),
      exerciseName,
      weightKg,
      reps,
      setNumber,
      loggedAt: new Date().toISOString(),
      angleData: pendingAngleData ?? undefined,
      poseConfidence: pendingPoseConfidence ?? undefined,
    };
    const updated = { ...activeSession, sets: [...activeSession.sets, newSet] };
    saveActiveSession(updated);
    addToPendingQueue({
      type: 'set',
      sessionId: activeSession.id,
      setId: newSet.id,
      payload: {
        id: newSet.id,
        exerciseName: newSet.exerciseName,
        weightKg: newSet.weightKg,
        reps: newSet.reps,
        setNumber: newSet.setNumber,
        loggedAt: newSet.loggedAt,
        angleData: newSet.angleData,
        poseConfidence: newSet.poseConfidence,
      },
    });
    set({ activeSession: updated, pendingAngleData: null, pendingPoseConfidence: null });
  },

  endSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    const endedAt = new Date().toISOString();
    const updated = { ...activeSession, endedAt };
    saveActiveSession(updated);
    addToPendingQueue({
      type: 'end_session',
      sessionId: activeSession.id,
      payload: { endedAt },
    });
    set({ activeSession: updated });
    await get().syncPending();
    clearActiveSession();
    clearSyncQueue();
    set({ activeSession: null, completedSession: updated });
  },

  syncPending: async () => {
    set({ isSyncing: true });
    const queue = loadPendingQueue();
    try {
      for (const item of queue) {
        try {
          if (item.type === 'session') {
            await apiClient.post('/sessions', item.payload);
          } else if (item.type === 'set') {
            await apiClient.post(`/sessions/${item.sessionId}/sets`, item.payload);
          } else if (item.type === 'end_session') {
            await apiClient.patch(`/sessions/${item.sessionId}`, item.payload);
          }
        } catch {
          // skip silently — offline or already synced (idempotent UUIDs)
        }
      }
    } finally {
      set({ isSyncing: false });
    }
  },

  discardSession: () => {
    clearActiveSession();
    clearSyncQueue();
    set({ activeSession: null });
  },

  clearCompletedSession: () => {
    set({ completedSession: null });
  },
}));
