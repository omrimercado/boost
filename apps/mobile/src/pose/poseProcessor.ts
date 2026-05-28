import { useTensorflowModel } from 'react-native-fast-tflite';
import { useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

const LANDMARK_COUNT = 33;
// BlazePose Lite output: [33 * 5] floats — (x, y, z, visibility, presence) per landmark
const VALUES_PER_LANDMARK = 5;
const VISIBILITY_INDEX = 3;
const VISIBILITY_THRESHOLD = 0.5;

// BlazePose Lite expects 256×256 RGB float32 input
const MODEL_INPUT_SIZE = 256;

/**
 * Runs BlazePose Lite on each camera frame via a VisionCamera frame processor.
 * Calls onLandmarkCount with the number of visible landmarks (~0–33) per frame.
 *
 * Model file: apps/mobile/assets/models/blazepose_lite.tflite
 * Download: see docs/mediapipe-spike.md
 */
export function usePoseFrameProcessor(
  onLandmarkCount: (count: number) => void
) {
  const model = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../assets/models/blazepose_lite.tflite')
  );
  const { resize } = useResizePlugin();
  const reportCount = Worklets.createRunOnJS(onLandmarkCount);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model.state !== 'loaded') return;

      const resized = resize(frame, {
        scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
        pixelFormat: 'rgb',
        dataType: 'float32',
        rotation: '0deg',
      });

      const outputs = model.model.runSync([resized]);
      const landmarkData = outputs[0];
      if (!landmarkData) return;

      let visibleCount = 0;
      for (let i = 0; i < LANDMARK_COUNT; i++) {
        const visibility = landmarkData[i * VALUES_PER_LANDMARK + VISIBILITY_INDEX];
        if (visibility > VISIBILITY_THRESHOLD) visibleCount++;
      }

      reportCount(visibleCount);
    },
    [model, resize, reportCount]
  );

  return { frameProcessor, modelState: model.state };
}
