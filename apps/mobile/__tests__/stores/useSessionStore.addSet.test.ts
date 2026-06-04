/// <reference types="jest" />

jest.mock('@/src/services/api', () => ({
  apiClient: { post: jest.fn(), patch: jest.fn() },
}));

import { useSessionStore } from '@/src/stores/useSessionStore';

const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

function freshStore() {
  useSessionStore.setState({
    activeSession: {
      id: SESSION_ID,
      startedAt: new Date().toISOString(),
      endedAt: null,
      exerciseName: 'squat',
      sets: [],
    },
    pendingAngleData: null,
    pendingPoseConfidence: null,
    isSyncing: false,
    completedSession: null,
  });
}

beforeEach(() => {
  freshStore();
});

describe('useSessionStore.addSet', () => {
  it('uses provided id when given', () => {
    const id = '11111111-1111-4111-a111-111111111111';
    useSessionStore.getState().addSet({ id, exerciseName: 'squat', weightKg: 80, reps: 5, setNumber: 1 });

    const sets = useSessionStore.getState().activeSession!.sets;
    expect(sets[0].id).toBe(id);
  });

  it('generates an id when not provided', () => {
    useSessionStore.getState().addSet({ exerciseName: 'squat', weightKg: null, reps: 8, setNumber: 1 });

    const sets = useSessionStore.getState().activeSession!.sets;
    expect(sets[0].id).toBeTruthy();
    expect(typeof sets[0].id).toBe('string');
  });

  it('appends set to activeSession sets', () => {
    useSessionStore.getState().addSet({ exerciseName: 'squat', weightKg: 60, reps: 10, setNumber: 1 });
    useSessionStore.getState().addSet({ exerciseName: 'squat', weightKg: 65, reps: 8, setNumber: 2 });

    const sets = useSessionStore.getState().activeSession!.sets;
    expect(sets).toHaveLength(2);
    expect(sets[1].reps).toBe(8);
  });

  it('clears pendingAngleData after addSet', () => {
    useSessionStore.setState({
      pendingAngleData: { knee_left: { min: 80, max: 120, avg: 100, deviationCount: 1 } },
      pendingPoseConfidence: 0.9,
    });

    useSessionStore.getState().addSet({ exerciseName: 'squat', weightKg: null, reps: 5, setNumber: 1 });

    expect(useSessionStore.getState().pendingAngleData).toBeNull();
    expect(useSessionStore.getState().pendingPoseConfidence).toBeNull();
  });

  it('attaches pendingAngleData to set when present', () => {
    const angleData = { knee_left: { min: 80, max: 120, avg: 100, deviationCount: 1 } };
    useSessionStore.setState({ pendingAngleData: angleData, pendingPoseConfidence: 0.85 });

    useSessionStore.getState().addSet({ exerciseName: 'squat', weightKg: null, reps: 5, setNumber: 1 });

    const sets = useSessionStore.getState().activeSession!.sets;
    expect(sets[0].angleData).toEqual(angleData);
    expect(sets[0].poseConfidence).toBe(0.85);
  });

  it('does nothing when there is no active session', () => {
    useSessionStore.setState({ activeSession: null });
    useSessionStore.getState().addSet({ exerciseName: 'squat', weightKg: null, reps: 5, setNumber: 1 });
    expect(useSessionStore.getState().activeSession).toBeNull();
  });
});
