import {
  angleBetween,
  backLeanAngle,
  computeAngles,
  buildAngleSummary,
  type JointAngles,
} from '@/src/pose/angleCalculator';
import type { PoseLandmark } from '@/src/pose/types';

// Builds a minimal landmark array (33 entries) at neutral upright position.
function makeLandmarks(overrides: Partial<Record<number, Partial<PoseLandmark>>> = {}): PoseLandmark[] {
  const base = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
  // Set anatomically plausible positions for key landmarks (image coords: y=0 top)
  // left/right shoulder (11, 12)
  base[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1, presence: 1 };
  base[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1, presence: 1 };
  // left/right elbow (13, 14)
  base[13] = { x: 0.3, y: 0.5, z: 0, visibility: 1, presence: 1 };
  base[14] = { x: 0.7, y: 0.5, z: 0, visibility: 1, presence: 1 };
  // left/right wrist (15, 16)
  base[15] = { x: 0.25, y: 0.7, z: 0, visibility: 1, presence: 1 };
  base[16] = { x: 0.75, y: 0.7, z: 0, visibility: 1, presence: 1 };
  // left/right hip (23, 24)
  base[23] = { x: 0.43, y: 0.6, z: 0, visibility: 1, presence: 1 };
  base[24] = { x: 0.57, y: 0.6, z: 0, visibility: 1, presence: 1 };
  // left/right knee (25, 26)
  base[25] = { x: 0.43, y: 0.77, z: 0, visibility: 1, presence: 1 };
  base[26] = { x: 0.57, y: 0.77, z: 0, visibility: 1, presence: 1 };
  // left/right ankle (27, 28)
  base[27] = { x: 0.43, y: 0.95, z: 0, visibility: 1, presence: 1 };
  base[28] = { x: 0.57, y: 0.95, z: 0, visibility: 1, presence: 1 };
  for (const [idx, patch] of Object.entries(overrides)) {
    base[Number(idx)] = { ...base[Number(idx)], ...patch };
  }
  return base;
}

describe('angleBetween', () => {
  it('returns 90° for a right angle', () => {
    const vertex = { x: 0, y: 0 };
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 1 };
    expect(angleBetween(a, vertex, b)).toBeCloseTo(90, 1);
  });

  it('returns 180° for a straight line', () => {
    const vertex = { x: 0, y: 0 };
    const a = { x: -1, y: 0 };
    const b = { x: 1, y: 0 };
    expect(angleBetween(a, vertex, b)).toBeCloseTo(180, 1);
  });

  it('returns 0° when a and b are coincident', () => {
    const vertex = { x: 0, y: 0 };
    expect(angleBetween({ x: 1, y: 0 }, vertex, { x: 1, y: 0 })).toBeCloseTo(0, 1);
  });

  it('returns 0 when vectors have near-zero magnitude', () => {
    const vertex = { x: 0, y: 0 };
    expect(angleBetween({ x: 0, y: 0 }, vertex, { x: 1, y: 1 })).toBe(0);
  });

  it('returns 45° for a 45-degree angle', () => {
    const vertex = { x: 0, y: 0 };
    const a = { x: 1, y: 0 };
    const b = { x: 1, y: 1 };
    expect(angleBetween(a, vertex, b)).toBeCloseTo(45, 1);
  });
});

describe('backLeanAngle', () => {
  it('returns ~0° for a perfectly upright torso', () => {
    const lm = makeLandmarks({
      11: { x: 0.4, y: 0.2 },
      12: { x: 0.6, y: 0.2 },
      23: { x: 0.4, y: 0.6 },
      24: { x: 0.6, y: 0.6 },
    });
    // shoulders directly above hips → no horizontal offset → 0° lean
    expect(backLeanAngle(lm)).toBeCloseTo(0, 1);
  });

  it('returns ~45° for a 45-degree lean', () => {
    const lm = makeLandmarks({
      11: { x: 0.5, y: 0.2 },
      12: { x: 0.5, y: 0.2 },
      23: { x: 0.1, y: 0.6 },
      24: { x: 0.1, y: 0.6 },
    });
    // Δx = 0.4, Δy = 0.4 → 45°
    expect(backLeanAngle(lm)).toBeCloseTo(45, 1);
  });
});

describe('computeAngles', () => {
  const lm = makeLandmarks();

  it('returns an empty object when fewer than 29 landmarks are provided', () => {
    expect(computeAngles([], 'squat')).toEqual({});
    expect(computeAngles(Array(20).fill({ x: 0, y: 0, z: 0, visibility: 1, presence: 1 }), 'squat')).toEqual({});
  });

  it('squat: returns knee_left, knee_right, hip_left, hip_right, back_lean', () => {
    const angles = computeAngles(lm, 'squat');
    expect(Object.keys(angles)).toEqual(
      expect.arrayContaining(['knee_left', 'knee_right', 'hip_left', 'hip_right', 'back_lean'])
    );
  });

  it('deadlift: returns hip and knee angles + back_lean', () => {
    const angles = computeAngles(lm, 'deadlift');
    expect(Object.keys(angles)).toEqual(
      expect.arrayContaining(['hip_left', 'hip_right', 'knee_left', 'knee_right', 'back_lean'])
    );
  });

  it('bench_press: returns elbow_left and elbow_right only', () => {
    const angles = computeAngles(lm, 'bench_press');
    expect(Object.keys(angles)).toEqual(expect.arrayContaining(['elbow_left', 'elbow_right']));
    expect(Object.keys(angles)).not.toContain('back_lean');
  });

  it('overhead_press: returns elbow angles + back_lean', () => {
    const angles = computeAngles(lm, 'overhead_press');
    expect(Object.keys(angles)).toEqual(
      expect.arrayContaining(['elbow_left', 'elbow_right', 'back_lean'])
    );
  });

  it('barbell_row: returns back_lean + elbow angles', () => {
    const angles = computeAngles(lm, 'barbell_row');
    expect(Object.keys(angles)).toEqual(
      expect.arrayContaining(['back_lean', 'elbow_left', 'elbow_right'])
    );
  });

  it('pull_up: returns elbow + shoulder angles', () => {
    const angles = computeAngles(lm, 'pull_up');
    expect(Object.keys(angles)).toEqual(
      expect.arrayContaining(['elbow_left', 'elbow_right', 'shoulder_left', 'shoulder_right'])
    );
  });

  it('lunge: returns knee_front, knee_back, torso_upright', () => {
    const angles = computeAngles(lm, 'lunge');
    expect(Object.keys(angles)).toEqual(
      expect.arrayContaining(['knee_front', 'knee_back', 'torso_upright'])
    );
  });

  it('all returned angles are numbers in [0, 180]', () => {
    const exercises = ['squat', 'deadlift', 'bench_press', 'overhead_press', 'barbell_row', 'pull_up', 'lunge'] as const;
    for (const ex of exercises) {
      for (const v of Object.values(computeAngles(lm, ex))) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('buildAngleSummary', () => {
  it('returns empty object for empty frames', () => {
    expect(buildAngleSummary([])).toEqual({});
  });

  it('returns correct min, max, avg for a single frame', () => {
    const frames: JointAngles[] = [{ knee_left: 90 }];
    const s = buildAngleSummary(frames);
    expect(s.knee_left.min).toBeCloseTo(90);
    expect(s.knee_left.max).toBeCloseTo(90);
    expect(s.knee_left.avg).toBeCloseTo(90);
    expect(s.knee_left.deviationCount).toBe(0);
  });

  it('correctly computes min/max/avg across multiple frames', () => {
    const frames: JointAngles[] = [
      { knee_left: 60 },
      { knee_left: 90 },
      { knee_left: 120 },
    ];
    const s = buildAngleSummary(frames);
    expect(s.knee_left.min).toBeCloseTo(60);
    expect(s.knee_left.max).toBeCloseTo(120);
    expect(s.knee_left.avg).toBeCloseTo(90);
  });

  it('handles multiple joints across frames', () => {
    const frames: JointAngles[] = [
      { elbow_left: 80, elbow_right: 85 },
      { elbow_left: 100, elbow_right: 95 },
    ];
    const s = buildAngleSummary(frames);
    expect(s.elbow_left.avg).toBeCloseTo(90);
    expect(s.elbow_right.avg).toBeCloseTo(90);
  });

  it('counts deviation frames (>2σ from mean)', () => {
    // 10 frames at 90°, 1 outlier at 10°
    // mean = (10*90 + 10) / 11 ≈ 82.7°
    // variance = Σ(v - mean)² / 11 ≈ 498.7  →  σ ≈ 22.3°
    // threshold = 2σ ≈ 44.6°
    // |10 - 82.7| = 72.7 > 44.6  →  exactly 1 deviation frame
    const frames: JointAngles[] = Array(10).fill({ knee_left: 90 });
    frames.push({ knee_left: 10 });
    const s = buildAngleSummary(frames);
    expect(s.knee_left.deviationCount).toBe(1);
  });

  it('handles sparse joints (not every frame has all joints)', () => {
    const frames: JointAngles[] = [
      { knee_left: 90 },
      { knee_right: 85 }, // knee_left missing
      { knee_left: 80, knee_right: 90 },
    ];
    const s = buildAngleSummary(frames);
    // knee_left appears in frames 0 and 2 only
    expect(s.knee_left.avg).toBeCloseTo((90 + 80) / 2);
    // knee_right appears in frames 1 and 2 only
    expect(s.knee_right.avg).toBeCloseTo((85 + 90) / 2);
  });
});
