import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useSessionStore } from '@/src/stores/useSessionStore';
import { usePoseProcessor } from '@/src/pose/poseProcessor';
import { computeAngles, buildAngleSummary, type JointAngles } from '@/src/pose/angleCalculator';
import type { PoseDetectionResult } from '@/src/pose/types';
import type { ExerciseName } from '@boost/shared';

const NO_POSE_TIMEOUT_MS = 5000;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CameraRecordingScreen() {
  const { activeSession, setPendingAngleData } = useSessionStore();
  const exercise = activeSession?.exerciseName as ExerciseName | null;

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showNoPoseWarning, setShowNoPoseWarning] = useState(false);
  const [capturedFrameCount, setCapturedFrameCount] = useState(0);

  // Accumulated angle frames for the current recording
  const angleFramesRef = useRef<JointAngles[]>([]);
  const totalConfidenceRef = useRef(0);
  const frameCountRef = useRef(0);
  const isStoppingRef = useRef(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noPoseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request permission on mount
  useEffect(() => {
    if (hasPermission === false) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const resetNoPoseTimer = useCallback(() => {
    setShowNoPoseWarning(false);
    if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
    noPoseTimerRef.current = setTimeout(() => {
      setShowNoPoseWarning(true);
    }, NO_POSE_TIMEOUT_MS);
  }, []);

  const handlePoseResult = useCallback(
    (result: PoseDetectionResult) => {
      if (!isRecording || !exercise) return;
      if (result.visibleCount > 0) {
        resetNoPoseTimer();
        const angles = computeAngles(result.landmarks, exercise);
        if (Object.keys(angles).length > 0) {
          angleFramesRef.current.push(angles);
          setCapturedFrameCount((n) => n + 1);
        }
        totalConfidenceRef.current += result.confidence;
        frameCountRef.current += 1;
      }
    },
    [isRecording, exercise, resetNoPoseTimer]
  );

  const { frameProcessor } = usePoseProcessor(handlePoseResult);

  const handleStartRecording = () => {
    angleFramesRef.current = [];
    totalConfidenceRef.current = 0;
    frameCountRef.current = 0;
    isStoppingRef.current = false;
    setElapsedSeconds(0);
    setCapturedFrameCount(0);
    setIsRecording(true);
    resetNoPoseTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
    setShowNoPoseWarning(false);

    const frames = angleFramesRef.current;
    const avgConfidence =
      frameCountRef.current > 0
        ? totalConfidenceRef.current / frameCountRef.current
        : 0;

    if (frames.length > 0) {
      const summary = buildAngleSummary(frames);
      setPendingAngleData(summary, avgConfidence);
    }
    router.back();
  };

  const handleSkipToManual = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
    setIsRecording(false);
    setShowNoPoseWarning(false);
    router.back();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
    };
  }, []);

  // ── Permission denied state ─────────────────────────────────────────────────
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <Ionicons name="camera-outline" size={36} color="#f97316" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            Allow camera access in your device settings to record your form for
            AI analysis.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            activeOpacity={0.85}
            style={styles.permissionBtn}
          >
            <Text style={styles.permissionBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSkipToManual}
            activeOpacity={0.7}
            style={styles.skipBtn}
          >
            <Text style={styles.skipBtnText}>Skip — Log Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── No device available ──────────────────────────────────────────────────────
  if (!device) {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Unavailable</Text>
          <TouchableOpacity
            onPress={handleSkipToManual}
            activeOpacity={0.85}
            style={styles.permissionBtn}
          >
            <Text style={styles.permissionBtnText}>Log Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Full-screen camera view ──────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={frameProcessor}
      />

      {/* Top overlay — back + exercise name */}
      <SafeAreaView edges={['top']} style={styles.topOverlay}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={isRecording ? undefined : () => router.back()}
            activeOpacity={isRecording ? 1 : 0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isRecording ? '#475569' : '#ffffff'}
            />
          </TouchableOpacity>
          <View style={styles.exercisePill}>
            <Text style={styles.exercisePillText}>
              {exercise
                ? exercise
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
                : '—'}
            </Text>
          </View>
          {isRecording ? (
            <View style={styles.recIndicator}>
              <View style={styles.recDot} />
              <Text style={styles.recTimer}>{formatTime(elapsedSeconds)}</Text>
            </View>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>
      </SafeAreaView>

      {/* No-pose warning overlay */}
      {showNoPoseWarning && (
        <View style={styles.noPoseOverlay}>
          <View style={styles.noPoseCard}>
            <Ionicons name="body-outline" size={28} color="#fb923c" />
            <Text style={styles.noPoseTitle}>No pose detected</Text>
            <Text style={styles.noPoseBody}>
              Adjust camera angle or improve lighting so your full body is
              visible.
            </Text>
            <TouchableOpacity
              onPress={handleSkipToManual}
              activeOpacity={0.85}
              style={styles.noPoseSkipBtn}
            >
              <Text style={styles.noPoseSkipText}>Skip Recording</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom overlay — record / stop controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomOverlay}>
        <View style={styles.bottomCard}>
          <Text style={styles.bottomHint}>
            {isRecording
              ? `${capturedFrameCount} frames captured`
              : 'Position yourself in frame, then start recording'}
          </Text>
          <TouchableOpacity
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            activeOpacity={0.85}
            style={[
              styles.recordBtn,
              isRecording ? styles.recordBtnStop : styles.recordBtnStart,
            ]}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'radio-button-on'}
              size={20}
              color="#ffffff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.recordBtnText}>
              {isRecording ? 'Stop & Save Angles' : 'Start Recording'}
            </Text>
          </TouchableOpacity>
          {!isRecording && (
            <TouchableOpacity
              onPress={handleSkipToManual}
              activeOpacity={0.7}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Skip — Log Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const OVERLAY_BG = 'rgba(2, 6, 23, 0.75)';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#020617' },

  // Permission / no-device states
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#020617',
  },
  permissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#431407',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionBody: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  permissionBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: OVERLAY_BG,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  exercisePill: {
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.5)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  exercisePillText: { color: '#fb923c', fontSize: 13, fontWeight: '600' },
  recIndicator: { flexDirection: 'row', alignItems: 'center' },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  recTimer: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  // No-pose overlay
  noPoseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  noPoseCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  noPoseTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  noPoseBody: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  noPoseSkipBtn: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  noPoseSkipText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Bottom overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: OVERLAY_BG,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomCard: { paddingBottom: 8 },
  bottomHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  recordBtn: {
    flexDirection: 'row',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  recordBtnStart: { backgroundColor: '#f97316' },
  recordBtnStop: { backgroundColor: '#dc2626' },
  recordBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { color: '#64748b', fontSize: 13 },
});
