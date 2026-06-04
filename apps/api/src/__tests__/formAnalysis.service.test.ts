/// <reference types="jest" />

jest.mock('dotenv/config', () => ({}));

const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

// Import after mocks are hoisted
import { formAnalysisService } from '../services/formAnalysis.service';

const SAMPLE_ANGLE_DATA = {
  knee_left: { min: 75, max: 125, avg: 95, deviationCount: 2 },
  knee_right: { min: 72, max: 120, avg: 93, deviationCount: 3 },
  hip_left: { min: 65, max: 105, avg: 85, deviationCount: 1 },
  hip_right: { min: 68, max: 108, avg: 87, deviationCount: 2 },
  back_lean: { min: 20, max: 50, avg: 35, deviationCount: 4 },
};

function makeToolUseResponse(scoreTier: string, coachingText: string) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tu_123',
        name: 'report_form_score',
        input: { score_tier: scoreTier, coaching_text: coachingText },
      },
    ],
    stop_reason: 'tool_use',
  };
}

beforeEach(() => {
  mockMessagesCreate.mockClear();
});

describe('FormAnalysisService.analyzeForm', () => {
  it('returns green score for good squat form', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeToolUseResponse('green', 'Good depth and back position — keep it up!')
    );

    const result = await formAnalysisService.analyzeForm('squat', 5, SAMPLE_ANGLE_DATA, 0.92);

    expect(result.scoreTier).toBe('green');
    expect(result.coachingText).toBe('Good depth and back position — keep it up!');
  });

  it('returns yellow score for minor form issues', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeToolUseResponse('yellow', 'Left knee caving slightly — push knees out.')
    );

    const result = await formAnalysisService.analyzeForm('squat', 3, SAMPLE_ANGLE_DATA, 0.75);

    expect(result.scoreTier).toBe('yellow');
    expect(result.coachingText).toContain('knee');
  });

  it('returns red score for significant form problems', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeToolUseResponse('red', 'Severe back rounding detected — reduce load immediately.')
    );

    const result = await formAnalysisService.analyzeForm('deadlift', 1, SAMPLE_ANGLE_DATA, 0.88);

    expect(result.scoreTier).toBe('red');
  });

  it('handles null confidence level', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse('green', 'Solid form overall.'));

    const result = await formAnalysisService.analyzeForm(
      'bench_press',
      8,
      { elbow_left: { min: 80, max: 95, avg: 87, deviationCount: 1 } },
      null
    );

    expect(result.scoreTier).toBe('green');

    const callArgs = mockMessagesCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('unknown');
  });

  it('truncates coaching text longer than 120 chars', async () => {
    const longText = 'A'.repeat(200);
    mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse('yellow', longText));

    const result = await formAnalysisService.analyzeForm('squat', 5, SAMPLE_ANGLE_DATA, 0.9);

    expect(result.coachingText.length).toBeLessThanOrEqual(120);
  });

  it('throws when Claude does not return a tool_use block', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Some unexpected text' }],
      stop_reason: 'end_turn',
    });

    await expect(
      formAnalysisService.analyzeForm('squat', 5, SAMPLE_ANGLE_DATA, 0.9)
    ).rejects.toThrow('FormAnalysisService: Claude did not return a tool_use block');
  });

  it('throws when score_tier is invalid', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeToolUseResponse('excellent', 'Perfect form.')
    );

    await expect(
      formAnalysisService.analyzeForm('squat', 5, SAMPLE_ANGLE_DATA, 0.9)
    ).rejects.toThrow('invalid score_tier');
  });

  it('passes exercise-specific system prompt to Claude', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse('green', 'Good.'));

    await formAnalysisService.analyzeForm('lunge', 10, SAMPLE_ANGLE_DATA, 0.85);

    const callArgs = mockMessagesCreate.mock.calls[0][0];
    expect(callArgs.system).toContain('lunge');
    expect(callArgs.system).toContain('knee_front');
  });

  it('includes reps count in user message', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse('green', 'Good.'));

    await formAnalysisService.analyzeForm('squat', 12, SAMPLE_ANGLE_DATA, 0.8);

    const callArgs = mockMessagesCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('12');
  });

  it('uses tool_choice any to force tool use', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse('green', 'Good.'));

    await formAnalysisService.analyzeForm('squat', 5, SAMPLE_ANGLE_DATA, 0.9);

    const callArgs = mockMessagesCreate.mock.calls[0][0];
    expect(callArgs.tool_choice).toEqual({ type: 'any' });
  });

  it('works for all supported exercises', async () => {
    const exercises = [
      'squat', 'deadlift', 'bench_press', 'overhead_press',
      'barbell_row', 'pull_up', 'lunge',
    ] as const;

    for (const exercise of exercises) {
      mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse('green', 'Good form.'));
      const result = await formAnalysisService.analyzeForm(exercise, 5, SAMPLE_ANGLE_DATA, 0.8);
      expect(['green', 'yellow', 'red']).toContain(result.scoreTier);
    }
  });

  it('propagates Anthropic SDK errors', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('API rate limit'));

    await expect(
      formAnalysisService.analyzeForm('squat', 5, SAMPLE_ANGLE_DATA, 0.9)
    ).rejects.toThrow('API rate limit');
  });
});
