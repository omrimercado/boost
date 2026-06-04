import type { ExerciseName } from '@boost/shared';
import type { PoseLandmark } from './types';

export type JointAngles = Record<string, number>;

export interface AngleSummaryEntry {
  min: number;
  max: number;
  avg: number;
  deviationCount: number;
}

export interface AngleSummary {
  [joint: string]: AngleSummaryEntry;
}

// BlazePose 33-landmark indices
const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

type Point2D = { x: number; y: number };

// Returns the angle (degrees) at `vertex` formed by rays to `a` and `b`.
export function angleBetween(a: Point2D, vertex: Point2D, b: Point2D): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x ** 2 + v1y ** 2);
  const mag2 = Math.sqrt(v2x ** 2 + v2y ** 2);
  if (mag1 < 1e-9 || mag2 < 1e-9) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI;
}

// Returns the forward lean angle of the torso (0 = upright, 90 = horizontal).
export function backLeanAngle(landmarks: PoseLandmark[]): number {
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];
  const sx = (ls.x + rs.x) / 2;
  const sy = (ls.y + rs.y) / 2;
  const hx = (lh.x + rh.x) / 2;
  const hy = (lh.y + rh.y) / 2;
  const dx = sx - hx;
  const dy = sy - hy;
  return Math.abs((Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI);
}

// Returns the joint angles relevant to `exercise` from a single frame.
export function computeAngles(
  landmarks: PoseLandmark[],
  exercise: ExerciseName
): JointAngles {
  if (landmarks.length < 29) return {};
  const lm = landmarks;

  switch (exercise) {
    case 'squat':
      return {
        knee_left: angleBetween(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE]),
        knee_right: angleBetween(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE]),
        hip_left: angleBetween(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE]),
        hip_right: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE]),
        back_lean: backLeanAngle(lm),
      };
    case 'deadlift':
      return {
        hip_left: angleBetween(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE]),
        hip_right: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE]),
        knee_left: angleBetween(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE]),
        knee_right: angleBetween(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE]),
        back_lean: backLeanAngle(lm),
      };
    case 'bench_press':
      return {
        elbow_left: angleBetween(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST]),
        elbow_right: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST]),
      };
    case 'overhead_press':
      return {
        elbow_left: angleBetween(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST]),
        elbow_right: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST]),
        back_lean: backLeanAngle(lm),
      };
    case 'barbell_row':
      return {
        back_lean: backLeanAngle(lm),
        elbow_left: angleBetween(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST]),
        elbow_right: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST]),
      };
    case 'pull_up':
      return {
        elbow_left: angleBetween(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST]),
        elbow_right: angleBetween(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST]),
        shoulder_left: angleBetween(lm[LM.LEFT_HIP], lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW]),
        shoulder_right: angleBetween(lm[LM.RIGHT_HIP], lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW]),
      };
    case 'lunge':
      return {
        knee_front: angleBetween(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE]),
        knee_back: angleBetween(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE]),
        torso_upright: backLeanAngle(lm),
      };
    default:
      return {};
  }
}

// Aggregates per-frame angle arrays into min/max/avg/deviationCount per joint.
export function buildAngleSummary(frames: JointAngles[]): AngleSummary {
  if (frames.length === 0) return {};

  const accumulated: Record<string, number[]> = {};
  for (const frame of frames) {
    for (const [joint, angle] of Object.entries(frame)) {
      if (!accumulated[joint]) accumulated[joint] = [];
      accumulated[joint].push(angle);
    }
  }

  const summary: AngleSummary = {};
  for (const [joint, values] of Object.entries(accumulated)) {
    const n = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const deviationCount = values.filter((v) => Math.abs(v - avg) > 2 * stdDev).length;
    summary[joint] = { min, max, avg, deviationCount };
  }
  return summary;
}
