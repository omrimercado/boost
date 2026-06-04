import type { ScoreTier, AngleData } from '@boost/shared';
import { apiClient } from './api';
import type { AxiosError } from 'axios';

export interface FormScoreResult {
  scoreTier: ScoreTier;
  coachingText: string;
}

export type FormAnalysisError =
  | 'timeout'
  | 'offline'
  | 'api_error';

export interface FormAnalysisSuccess {
  ok: true;
  result: FormScoreResult;
}

export interface FormAnalysisFailure {
  ok: false;
  reason: FormAnalysisError;
}

export type FormAnalysisOutcome = FormAnalysisSuccess | FormAnalysisFailure;

const ANALYSIS_TIMEOUT_MS = 5000;

export async function syncSetAndAnalyzeForm(
  sessionId: string,
  setPayload: {
    id: string;
    exerciseName: string;
    weightKg: number | null;
    reps: number;
    setNumber: number;
    loggedAt: string;
  },
  angleData: AngleData,
  confidenceLevel: number | null,
): Promise<FormAnalysisOutcome> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ANALYSIS_TIMEOUT_MS)
  );

  const analysisPromise = (async (): Promise<FormAnalysisSuccess> => {
    await apiClient.post(`/sessions/${sessionId}/sets`, setPayload);

    const response = await apiClient.post<{
      data: { formScore: FormScoreResult & { id: string; setId: string } };
    }>(`/sets/${setPayload.id}/form-score`, {
      angleData,
      confidenceLevel: confidenceLevel ?? undefined,
    });

    return { ok: true, result: response.data.data.formScore };
  })();

  try {
    return await Promise.race([analysisPromise, timeoutPromise]);
  } catch (err) {
    if ((err as Error).message === 'TIMEOUT') {
      return { ok: false, reason: 'timeout' };
    }

    const axiosErr = err as AxiosError;
    if (
      !axiosErr.response &&
      (axiosErr.code === 'ECONNABORTED' ||
        axiosErr.code === 'ERR_NETWORK' ||
        axiosErr.message === 'Network Error')
    ) {
      return { ok: false, reason: 'offline' };
    }

    return { ok: false, reason: 'api_error' };
  }
}
