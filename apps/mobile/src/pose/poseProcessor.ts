import { useTensorflowModel } from 'react-native-fast-tflite';
import { useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import type { PoseDetectionResult, PoseLandmark } from './types';

// Model asset imported as a static resource; require is intentional (Metro bundler).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL_ASSET = require('../../assets/models/blazepose_lite.tflite') as number;
const NUM_LANDMARKS = 33;
const VISIBILITY_THRESHOLD = 0.5;

export function usePoseProcessor(onResult: (result: PoseDetectionResult) => void) {
  const model = useTensorflowModel(MODEL_ASSET);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model.state !== 'loaded') return;
      // Frame pixel data passed as raw buffer input to the TFLite model.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outputs = model.model.runSync([frame as any]);
      if (!outputs?.[0]) return;
      // Inline landmark parsing (must stay in worklet scope)
      const raw = outputs[0] as unknown as Float32Array;
      const landmarks: PoseLandmark[] = [];
      for (let i = 0; i < NUM_LANDMARKS; i++) {
        const b = i * 5;
        landmarks.push({
          x: raw[b],
          y: raw[b + 1],
          z: raw[b + 2],
          visibility: raw[b + 3],
          presence: raw[b + 4],
        });
      }
      const visibleCount = landmarks.filter((lm) => lm.visibility > VISIBILITY_THRESHOLD).length;
      const confidence =
        landmarks.reduce((s, lm) => s + lm.visibility, 0) / NUM_LANDMARKS;
      runOnJS(onResult)({ landmarks, visibleCount, confidence });
    },
    [model, onResult]
  );

  return { frameProcessor, isModelReady: model.state === 'loaded' };
}
