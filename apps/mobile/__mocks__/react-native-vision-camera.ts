import React from 'react';

export const Camera = 'Camera';

export const useCameraDevice = jest.fn(() => ({ id: 'back', hasFlash: false, position: 'back' }));

export const useCameraPermission = jest.fn(() => ({
  hasPermission: false,
  requestPermission: jest.fn().mockResolvedValue(true),
}));

export const useFrameProcessor = jest.fn((_fn: unknown, _deps: unknown[]) => undefined);
