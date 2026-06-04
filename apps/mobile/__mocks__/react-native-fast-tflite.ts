export const useTensorflowModel = jest.fn(() => ({
  state: 'loaded' as const,
  model: {
    runSync: jest.fn().mockReturnValue([new Float32Array(33 * 5)]),
  },
}));
