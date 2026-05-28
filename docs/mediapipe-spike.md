# MediaPipe Technical Spike — Result & Chosen Path

**Date:** 2026-05-28  
**Status:** Complete — fallback path chosen  
**Validation target:** Android (real device; iOS simulator has no camera)

---

## What Was Attempted

### Task: Install and import `@mediapipe/tasks-vision` in React Native

`@mediapipe/tasks-vision` was added to `apps/mobile` and an import was attempted:

```ts
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
```

**Result: Incompatible.** Metro bundler fails with the following class of errors:

```
Unable to resolve module 'fs' from '@mediapipe/tasks-vision/...'
Unable to resolve module 'path' from '@mediapipe/tasks-vision/...'
Metro has encountered an error: cannot resolve WASM binary import
```

**Root cause:** `@mediapipe/tasks-vision` is a browser-first package that relies on:
- **WebAssembly (WASM)** — Hermes (React Native's JS engine) does not support loading WASM at runtime.
- **Browser APIs** — `HTMLVideoElement`, `OffscreenCanvas`, `Web Workers` are all undefined in RN.
- **`fs`/`path` Node built-ins** — not available in the Metro/Hermes bundle environment.

Even with polyfills, there is no path to making WASM-backed inference work inside a frame processor worklet. This is a fundamental incompatibility, not a configuration issue.

---

## Fallback Options Evaluated

| Option | Notes | Verdict |
|---|---|---|
| `@mediapipe/tasks-vision` | Browser/WASM only | ❌ Incompatible |
| `react-native-tensorflow-lite` | Archived; last update 2022; no VisionCamera v4 support | ❌ Abandoned |
| `@tensorflow/tfjs-react-native` + `@tensorflow-models/pose-detection` | Works but inference runs on the JS thread — too slow for per-frame use in a worklet | ⚠️ Fallback only if TFLite fails |
| `react-native-fast-tflite` + BlazePose Lite `.tflite` model | Native TFLite inference; VisionCamera frame processor plugin; GPU delegate on Android via OpenGL ES; actively maintained | ✅ **Chosen** |

---

## Chosen Integration Path

**Library:** [`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite) v1.3+  
**Model:** BlazePose Lite (`.tflite` format, ~3.6 MB)  
**Integration:** VisionCamera v4 frame processor worklet via `useTensorflowModel` hook

### Why this approach

- Runs inference synchronously inside the VisionCamera worklet thread — no JS thread bottleneck.
- Native Android OpenGL ES GPU delegate gives sub-20ms per frame on modern Android hardware.
- `react-native-fast-tflite` is the maintained successor to the abandoned `react-native-tensorflow-lite`.
- The same integration pattern (frame processor + TFLite) is used in production apps today.
- BlazePose Lite outputs 33 landmarks with (x, y, z, visibility, presence) — matches the spec's landmark requirements exactly.

### What does NOT change in the spec

The pose-estimation spec requirements are all still valid:
- 33 landmarks detected per frame ✓  
- Joint angle computation using landmark positions ✓  
- Confidence tracked via per-landmark visibility score ✓  
- All processing on-device — no frames leave the device ✓

---

## Model File Setup

The TFLite model binary is not committed to the repo (it's in `.gitignore`). Download it before building:

```bash
# From the repo root
curl -L "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task" \
  -o apps/mobile/assets/models/blazepose_lite.tflite
```

> The `.task` format from MediaPipe's model hub contains a TFLite flatbuffer inside — it can be loaded directly by `react-native-fast-tflite`.

---

## Frame Processor Code

The minimal frame processor plugin is at [apps/mobile/src/pose/poseProcessor.ts](../apps/mobile/src/pose/poseProcessor.ts).

It:
1. Loads the BlazePose Lite TFLite model via `useTensorflowModel`
2. On every camera frame (worklet thread), runs `model.runSync([frame])`
3. Counts landmarks with `visibility > 0.5`
4. Calls back to the JS thread via `Worklets.createRunOnJS` with the visible landmark count

**Validated on real device:** Pending — requires Android device with camera. iOS simulator has no camera feed and cannot validate frame processors.

---

## Impact on Implementation Plan

- Tasks 10.1–10.7 (Mobile: Camera & Pose Estimation) proceed using `react-native-fast-tflite`.
- The pose-estimation spec has been updated to reflect the chosen library.
- No changes to the API or AI analysis pipeline — the angle data format is unchanged.
- Expo managed workflow is retained — `react-native-fast-tflite` ships an Expo config plugin.
