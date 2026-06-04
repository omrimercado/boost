import Anthropic from '@anthropic-ai/sdk';
import type { ExerciseName, AngleData } from '@boost/shared';

export interface FormAnalysisResult {
  scoreTier: 'green' | 'yellow' | 'red';
  coachingText: string;
}

interface JointThreshold {
  ideal: [number, number];
  description: string;
}

interface ExerciseSpec {
  description: string;
  joints: Partial<Record<string, JointThreshold>>;
}

const EXERCISE_SPECS: Record<ExerciseName, ExerciseSpec> = {
  squat: {
    description: 'Barbell back squat — assess depth, knee tracking, and torso position',
    joints: {
      knee_left: { ideal: [80, 120], description: 'knee flexion angle at depth' },
      knee_right: { ideal: [80, 120], description: 'knee flexion angle at depth' },
      hip_left: { ideal: [70, 110], description: 'hip flexion angle at depth' },
      hip_right: { ideal: [70, 110], description: 'hip flexion angle at depth' },
      back_lean: { ideal: [25, 55], description: 'forward torso lean from vertical (degrees)' },
    },
  },
  deadlift: {
    description: 'Conventional deadlift — assess hip hinge, back neutrality, and bar path',
    joints: {
      hip_left: { ideal: [60, 95], description: 'hip angle at setup/bottom position' },
      hip_right: { ideal: [60, 95], description: 'hip angle at setup/bottom position' },
      knee_left: { ideal: [80, 130], description: 'knee angle at setup' },
      knee_right: { ideal: [80, 130], description: 'knee angle at setup' },
      back_lean: { ideal: [30, 65], description: 'back angle from horizontal (degrees)' },
    },
  },
  bench_press: {
    description: 'Barbell bench press — assess elbow angle, bar path, and shoulder safety',
    joints: {
      elbow_left: { ideal: [70, 100], description: 'elbow angle at bottom position' },
      elbow_right: { ideal: [70, 100], description: 'elbow angle at bottom position' },
    },
  },
  overhead_press: {
    description: 'Standing overhead press — assess elbow angle, back arch, and lockout',
    joints: {
      elbow_left: { ideal: [75, 180], description: 'elbow angle (rack ~90°, lockout ~175°)' },
      elbow_right: { ideal: [75, 180], description: 'elbow angle (rack ~90°, lockout ~175°)' },
      back_lean: { ideal: [0, 20], description: 'excessive back arch from vertical (should be minimal)' },
    },
  },
  barbell_row: {
    description: 'Barbell row — assess hip hinge position, elbow path, and back angle',
    joints: {
      back_lean: { ideal: [20, 50], description: 'torso angle from horizontal in hinge position' },
      elbow_left: { ideal: [20, 60], description: 'elbow angle at top of pull' },
      elbow_right: { ideal: [20, 60], description: 'elbow angle at top of pull' },
    },
  },
  pull_up: {
    description: 'Pull-up / chin-up — assess full range of motion and shoulder engagement',
    joints: {
      elbow_left: { ideal: [0, 40], description: 'elbow angle at top (full flexion)' },
      elbow_right: { ideal: [0, 40], description: 'elbow angle at top (full flexion)' },
      shoulder_left: { ideal: [140, 180], description: 'shoulder angle at top of pull' },
      shoulder_right: { ideal: [140, 180], description: 'shoulder angle at top of pull' },
    },
  },
  lunge: {
    description: 'Forward lunge — assess knee alignment, torso position, and depth',
    joints: {
      knee_front: { ideal: [80, 100], description: 'front knee angle at depth' },
      knee_back: { ideal: [80, 100], description: 'back knee angle at depth' },
      torso_upright: { ideal: [75, 100], description: 'torso angle from horizontal (near vertical)' },
    },
  },
};

function buildSystemPrompt(exercise: ExerciseName): string {
  const spec = EXERCISE_SPECS[exercise];
  const thresholdLines = Object.entries(spec.joints)
    .map(([joint, t]) => {
      if (!t) return '';
      return `  - ${joint} (${t.description}): ideal average range ${t.ideal[0]}°–${t.ideal[1]}°`;
    })
    .filter(Boolean)
    .join('\n');

  return `You are a certified strength and conditioning coach analyzing computer-vision pose data.
Your job is to evaluate exercise form and return a score tier with brief coaching feedback.

Exercise: ${exercise.replace(/_/g, ' ')} — ${spec.description}

Score tiers:
- green: Good form. Joint angles are within ideal ranges with few deviations. Safe to continue.
- yellow: Minor form issues. Small corrections recommended for better performance or injury prevention.
- red: Significant form problems detected. Correction required before loading more weight to avoid injury.

Ideal angle ranges for ${exercise.replace(/_/g, ' ')}:
${thresholdLines}

Guidelines:
- A low confidence level (<0.5) means landmarks were frequently occluded — be lenient and note uncertainty.
- High deviationCount (>30% of reps) for a joint means inconsistent form on that joint.
- Focus coaching text on the most critical single issue. Keep it under 80 characters.
- Always call the report_form_score tool with your analysis.`;
}

function buildUserMessage(
  reps: number,
  angleData: AngleData,
  confidenceLevel: number | null,
): string {
  const angleLines = Object.entries(angleData)
    .map(([joint, stats]) =>
      `  ${joint}: min=${Math.round(stats.min)}° max=${Math.round(stats.max)}° avg=${Math.round(stats.avg)}° deviations=${stats.deviationCount}`,
    )
    .join('\n');

  const confidenceLine =
    confidenceLevel !== null
      ? `Pose confidence: ${Math.round(confidenceLevel * 100)}%`
      : 'Pose confidence: unknown';

  return `Reps performed: ${reps}
${confidenceLine}

Joint angle statistics (across all frames):
${angleLines}

Analyze the form and call report_form_score with your result.`;
}

class FormAnalysisService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyzeForm(
    exercise: ExerciseName,
    reps: number,
    angleData: AngleData,
    confidenceLevel: number | null,
  ): Promise<FormAnalysisResult> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: buildSystemPrompt(exercise),
      messages: [
        { role: 'user', content: buildUserMessage(reps, angleData, confidenceLevel) },
      ],
      tools: [
        {
          name: 'report_form_score',
          description: 'Report the form score and coaching feedback for the set',
          input_schema: {
            type: 'object' as const,
            properties: {
              score_tier: {
                type: 'string',
                enum: ['green', 'yellow', 'red'],
                description: 'Form quality tier',
              },
              coaching_text: {
                type: 'string',
                description: 'Concise actionable coaching feedback (max 80 chars)',
              },
            },
            required: ['score_tier', 'coaching_text'],
          },
        },
      ],
      tool_choice: { type: 'any' },
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('FormAnalysisService: Claude did not return a tool_use block');
    }

    const input = toolUse.input as { score_tier: string; coaching_text: string };
    const validTiers = ['green', 'yellow', 'red'] as const;
    if (!validTiers.includes(input.score_tier as (typeof validTiers)[number])) {
      throw new Error(`FormAnalysisService: invalid score_tier "${input.score_tier}"`);
    }

    return {
      scoreTier: input.score_tier as 'green' | 'yellow' | 'red',
      coachingText: String(input.coaching_text).slice(0, 120),
    };
  }
}

export const formAnalysisService = new FormAnalysisService();
