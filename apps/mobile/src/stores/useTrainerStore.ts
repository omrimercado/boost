import { create } from 'zustand';
import { apiClient } from '../services/api';
import type { ApiResponse } from '@boost/shared';

export interface TraineeRow {
  linkId: string;
  traineeId: string | null;
  email: string;
  status: 'pending' | 'active';
  lastSessionAt: string | null;
  unreadRedAlertCount: number;
}

export interface TrainerSessionItem {
  id: string;
  traineeId: string;
  startedAt: string;
  endedAt: string | null;
  setCount: number;
  scoreSummary: { green: number; yellow: number; red: number };
  isRead: boolean;
}

interface TrainerState {
  trainees: TraineeRow[];
  loadingTrainees: boolean;
  fetchTrainees: () => Promise<void>;
  decrementRedAlert: (traineeId: string) => void;
}

export const useTrainerStore = create<TrainerState>((set) => ({
  trainees: [],
  loadingTrainees: false,

  fetchTrainees: async () => {
    set({ loadingTrainees: true });
    try {
      const { data } = await apiClient.get<ApiResponse<{ trainees: TraineeRow[] }>>(
        '/trainer/trainees'
      );
      set({ trainees: data.data.trainees });
    } finally {
      set({ loadingTrainees: false });
    }
  },

  decrementRedAlert: (traineeId: string) =>
    set((state) => ({
      trainees: state.trainees.map((t) =>
        t.traineeId === traineeId
          ? { ...t, unreadRedAlertCount: Math.max(0, t.unreadRedAlertCount - 1) }
          : t
      ),
    })),
}));
