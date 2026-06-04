/// <reference types="jest" />
import type { AngleData } from '@boost/shared';

jest.mock('@/src/services/api', () => ({
  apiClient: { post: jest.fn() },
}));

// Import after jest.mock so we get the mocked module
import { apiClient } from '@/src/services/api';
import { syncSetAndAnalyzeForm } from '@/src/services/formAnalysis';

const mockPost = apiClient.post as jest.Mock;

const ANGLE_DATA: AngleData = {
  knee_left: { min: 80, max: 120, avg: 95, deviationCount: 2 },
  hip_left: { min: 70, max: 100, avg: 82, deviationCount: 1 },
};

const SET_PAYLOAD = {
  id: '11111111-1111-4111-a111-111111111111',
  exerciseName: 'squat',
  weightKg: 80,
  reps: 5,
  setNumber: 1,
  loggedAt: '2024-06-01T10:00:00Z',
};

const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

const FORM_SCORE_RESPONSE = {
  data: {
    data: {
      formScore: { id: 'fs-1', setId: SET_PAYLOAD.id, scoreTier: 'green', coachingText: 'Great squat!' },
    },
  },
};

const SET_RESPONSE = { data: { data: { set: { id: SET_PAYLOAD.id } } } };

beforeEach(() => {
  mockPost.mockReset();
});

describe('syncSetAndAnalyzeForm', () => {
  it('returns success with scoreTier and coachingText on happy path', async () => {
    mockPost.mockResolvedValueOnce(SET_RESPONSE).mockResolvedValueOnce(FORM_SCORE_RESPONSE);

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.9);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.scoreTier).toBe('green');
      expect(result.result.coachingText).toBe('Great squat!');
    }
  });

  it('calls POST /sessions/:id/sets first, then POST /sets/:id/form-score', async () => {
    mockPost.mockResolvedValueOnce(SET_RESPONSE).mockResolvedValueOnce(FORM_SCORE_RESPONSE);

    await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.7);

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0][0]).toBe(`/sessions/${SESSION_ID}/sets`);
    expect(mockPost.mock.calls[1][0]).toBe(`/sets/${SET_PAYLOAD.id}/form-score`);
  });

  it('passes angleData and confidenceLevel to form-score endpoint', async () => {
    mockPost.mockResolvedValueOnce(SET_RESPONSE).mockResolvedValueOnce(FORM_SCORE_RESPONSE);

    await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.85);

    expect(mockPost.mock.calls[1][1]).toMatchObject({ angleData: ANGLE_DATA, confidenceLevel: 0.85 });
  });

  it('omits confidenceLevel from request when null', async () => {
    mockPost.mockResolvedValueOnce(SET_RESPONSE).mockResolvedValueOnce(FORM_SCORE_RESPONSE);

    await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, null);

    expect(mockPost.mock.calls[1][1].confidenceLevel).toBeUndefined();
  });

  it('returns timeout failure when request takes > 5 seconds', async () => {
    jest.useFakeTimers();
    mockPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10_000))
    );

    const promise = syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.8);
    jest.advanceTimersByTime(5001);

    const result = await promise;

    // Drain remaining fake timers so background promises settle
    jest.runAllTimers();
    await Promise.resolve();
    jest.useRealTimers();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('timeout');
  });

  it('returns offline failure for ERR_NETWORK errors', async () => {
    const networkErr = Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
    mockPost.mockRejectedValueOnce(networkErr);

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.8);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('offline');
  });

  it('returns offline failure for ECONNABORTED', async () => {
    const connErr = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
    mockPost.mockRejectedValueOnce(connErr);

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.8);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('offline');
  });

  it('returns api_error failure for server errors (4xx/5xx)', async () => {
    const serverErr = Object.assign(new Error('500'), {
      response: { status: 500, data: {} },
    });
    mockPost.mockRejectedValueOnce(serverErr);

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.9);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('api_error');
  });

  it('returns api_error for generic errors', async () => {
    mockPost.mockRejectedValueOnce(new Error('Unknown error'));

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.9);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('api_error');
  });

  it('returns yellow score result', async () => {
    mockPost
      .mockResolvedValueOnce(SET_RESPONSE)
      .mockResolvedValueOnce({
        data: { data: { formScore: { scoreTier: 'yellow', coachingText: 'Minor knee cave.' } } },
      });

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.6);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.result.scoreTier).toBe('yellow');
  });

  it('returns red score result', async () => {
    mockPost
      .mockResolvedValueOnce(SET_RESPONSE)
      .mockResolvedValueOnce({
        data: { data: { formScore: { scoreTier: 'red', coachingText: 'Dangerous back rounding.' } } },
      });

    const result = await syncSetAndAnalyzeForm(SESSION_ID, SET_PAYLOAD, ANGLE_DATA, 0.9);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.result.scoreTier).toBe('red');
  });
});
