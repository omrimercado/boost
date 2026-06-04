import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '@/src/stores/useSessionStore';
import { syncSetAndAnalyzeForm, type FormScoreResult } from '@/src/services/formAnalysis';
import type { ScoreTier } from '@boost/shared';

const ANGLE_JOINT_LABELS: Record<string, string> = {
  knee_left: 'Knee L',
  knee_right: 'Knee R',
  hip_left: 'Hip L',
  hip_right: 'Hip R',
  elbow_left: 'Elbow L',
  elbow_right: 'Elbow R',
  shoulder_left: 'Shoulder L',
  shoulder_right: 'Shoulder R',
  back_lean: 'Back Lean',
  torso_upright: 'Torso',
  knee_front: 'Front Knee',
  knee_back: 'Back Knee',
};

const SCORE_CONFIG: Record<ScoreTier, { bg: string; border: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  green: { bg: '#052e16', border: '#166534', text: '#4ade80', icon: 'checkmark-circle' },
  yellow: { bg: '#422006', border: '#92400e', text: '#fbbf24', icon: 'warning' },
  red: { bg: '#450a0a', border: '#991b1b', text: '#f87171', icon: 'close-circle' },
};

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatExercise(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type AnalysisState = 'idle' | 'analyzing' | 'success' | 'timeout' | 'offline' | 'error';

export default function SetLoggingScreen() {
  const { activeSession, addSet, endSession, isSyncing, pendingAngleData, pendingPoseConfidence, clearPendingAngleData } = useSessionStore();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [inputError, setInputError] = useState('');
  const [lastSavedSet, setLastSavedSet] = useState<number | null>(null);

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [formScoreResult, setFormScoreResult] = useState<FormScoreResult | null>(null);
  const [pendingSetNumber, setPendingSetNumber] = useState<number | null>(null);

  const exercise = activeSession?.exerciseName;
  const setsForExercise =
    activeSession?.sets.filter((s) => s.exerciseName === exercise) ?? [];
  const setNumber = setsForExercise.length + 1;

  const handleSave = async () => {
    setInputError('');
    const repsNum = parseInt(reps, 10);
    if (!reps.trim() || isNaN(repsNum) || repsNum < 1) {
      setInputError('Please enter a valid rep count.');
      return;
    }
    if (!exercise || !activeSession) return;

    const weightNum = weight.trim() ? parseFloat(weight) : null;

    if (pendingAngleData) {
      const setId = generateUUID();
      const loggedAt = new Date().toISOString();

      // Save locally immediately so the set is not lost regardless of AI outcome
      addSet({ id: setId, exerciseName: exercise, weightKg: weightNum, reps: repsNum, setNumber });
      setPendingSetNumber(setNumber);
      setWeight('');
      setReps('');
      setAnalysisState('analyzing');

      const outcome = await syncSetAndAnalyzeForm(
        activeSession.id,
        {
          id: setId,
          exerciseName: exercise,
          weightKg: weightNum,
          reps: repsNum,
          setNumber,
          loggedAt,
        },
        pendingAngleData,
        pendingPoseConfidence,
      );

      if (outcome.ok) {
        setFormScoreResult(outcome.result);
        setAnalysisState('success');
      } else {
        setAnalysisState(outcome.reason === 'api_error' ? 'error' : outcome.reason);
      }
    } else {
      addSet({ exerciseName: exercise, weightKg: weightNum, reps: repsNum, setNumber });
      setLastSavedSet(setNumber);
      setWeight('');
      setReps('');
    }
  };

  const handleDismissResult = () => {
    setAnalysisState('idle');
    setFormScoreResult(null);
    setLastSavedSet(pendingSetNumber);
    setPendingSetNumber(null);
  };

  const handleEndSession = async () => {
    await endSession();
    router.replace('/trainee/session/summary' as never);
  };

  if (!activeSession || !exercise) {
    return (
      <SafeAreaView
        className="flex-1 bg-slate-950 items-center justify-center"
        edges={['top']}
      >
        <Text className="text-slate-500 text-sm">No active session.</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.replace('/trainee' as never)}>
          <Text className="text-orange-500 font-medium">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Analyzing overlay ───────────────────────────────────────────────────────
  if (analysisState === 'analyzing') {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-8" edges={['top', 'bottom']}>
        <View className="items-center">
          <ActivityIndicator size="large" color="#f97316" style={{ marginBottom: 20 }} />
          <Text className="text-white text-lg font-bold mb-2">Analyzing your form...</Text>
          <Text className="text-slate-400 text-sm text-center">
            Our AI coach is reviewing your movement data
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form score result card ──────────────────────────────────────────────────
  if (analysisState === 'success' && formScoreResult) {
    const cfg = SCORE_CONFIG[formScoreResult.scoreTier];
    const tierLabel = formScoreResult.scoreTier.charAt(0).toUpperCase() + formScoreResult.scoreTier.slice(1);
    return (
      <SafeAreaView className="flex-1 bg-slate-950 px-5" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          <View
            style={[styles.resultCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
          >
            {/* Score badge */}
            <View className="items-center mb-5">
              <Ionicons name={cfg.icon} size={48} color={cfg.text} />
              <Text style={[styles.tierLabel, { color: cfg.text }]}>{tierLabel} Form</Text>
              <View style={[styles.tierBadge, { backgroundColor: cfg.border }]}>
                <Text style={{ color: cfg.text, fontWeight: 'bold', fontSize: 12 }}>{tierLabel.toUpperCase()}</Text>
              </View>
            </View>

            {/* Coaching text */}
            <Text className="text-white text-sm text-center leading-5 mb-6">
              {formScoreResult.coachingText}
            </Text>

            {/* Log This Set button */}
            <TouchableOpacity
              onPress={handleDismissResult}
              activeOpacity={0.85}
              className="bg-orange-500 rounded-2xl py-4 items-center"
              accessibilityRole="button"
              accessibilityLabel="Log This Set"
            >
              <Text className="text-white font-bold text-base">Log This Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error / timeout states ─────────────────────────────────────────────────
  if (analysisState === 'timeout' || analysisState === 'offline' || analysisState === 'error') {
    const message =
      analysisState === 'timeout'
        ? 'Analysis unavailable — took too long'
        : analysisState === 'offline'
        ? 'No connection — form analysis skipped'
        : "Couldn't analyze this set";

    return (
      <SafeAreaView className="flex-1 bg-slate-950 px-5" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          <View className="bg-slate-900 border border-slate-700 rounded-3xl p-6 items-center">
            <Ionicons name="cloud-offline-outline" size={40} color="#64748b" style={{ marginBottom: 16 }} />
            <Text className="text-slate-300 text-base font-semibold text-center mb-2">
              {message}
            </Text>
            <Text className="text-slate-500 text-sm text-center mb-6">
              Your set was saved locally. You can still log it without a score.
            </Text>
            <TouchableOpacity
              onPress={handleDismissResult}
              activeOpacity={0.85}
              className="bg-orange-500 rounded-2xl py-4 items-center w-full"
              accessibilityRole="button"
              accessibilityLabel="Log This Set"
            >
              <Text className="text-white font-bold text-base">Log This Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Normal set logging form ────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={22} color="#fb923c" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">
            {formatExercise(exercise)}
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            {activeSession.sets.length} set
            {activeSession.sets.length !== 1 ? 's' : ''} logged total
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleEndSession}
          disabled={isSyncing}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 flex-row items-center"
          activeOpacity={0.75}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#4ade80"
                style={{ marginRight: 5 }}
              />
              <Text className="text-green-400 text-sm font-medium">End Session</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="px-5 pt-6">
            {/* Record form button / angle data preview */}
            {pendingAngleData ? (
              <View className="bg-orange-950 border border-orange-800 rounded-2xl p-4 mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" style={{ marginRight: 6 }} />
                    <Text className="text-green-400 text-xs font-semibold uppercase tracking-wider">
                      Form data recorded
                    </Text>
                  </View>
                  <TouchableOpacity onPress={clearPendingAngleData} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {Object.entries(pendingAngleData)
                    .slice(0, 4)
                    .map(([joint, data]) => (
                      <View key={joint} className="bg-slate-800 rounded-lg px-3 py-1.5">
                        <Text className="text-slate-400 text-xs">{ANGLE_JOINT_LABELS[joint] ?? joint}</Text>
                        <Text className="text-white text-xs font-semibold">{Math.round(data.avg)}°</Text>
                      </View>
                    ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/trainee/session/camera' as never)}
                activeOpacity={0.85}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-5 flex-row items-center"
              >
                <View className="w-10 h-10 bg-orange-500/10 border border-orange-500/30 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="videocam-outline" size={20} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">Record Your Form</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">AI pose analysis via camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#475569" />
              </TouchableOpacity>
            )}

            {/* Set counter card */}
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-row items-center mb-6">
              <View className="w-12 h-12 bg-orange-500/10 rounded-xl items-center justify-center mr-4">
                <Text className="text-orange-500 font-black text-xl">{setNumber}</Text>
              </View>
              <View>
                <Text className="text-white font-semibold">Set {setNumber}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">
                  {setsForExercise.length > 0
                    ? `${setsForExercise.length} saved for this exercise`
                    : 'First set'}
                </Text>
              </View>
            </View>

            {/* Weight input */}
            <View className="mb-5">
              <Text className="text-slate-400 text-sm font-medium mb-2">
                Weight (kg) — optional
              </Text>
              <TextInput
                className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white text-base"
                placeholder="0"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                returnKeyType="next"
              />
            </View>

            {/* Reps input */}
            <View className="mb-5">
              <Text className="text-slate-400 text-sm font-medium mb-2">Reps</Text>
              <TextInput
                className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white text-base"
                placeholder="e.g. 8"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={reps}
                onChangeText={setReps}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Error */}
            {inputError ? (
              <View className="bg-red-950 border border-red-900 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#f87171"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="text-red-400 text-sm flex-1"
                  accessibilityRole="alert"
                >
                  {inputError}
                </Text>
              </View>
            ) : null}

            {/* Save confirmation */}
            {lastSavedSet !== null && !inputError ? (
              <View className="bg-green-950 border border-green-900 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#4ade80"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-green-400 text-sm">
                  Set {lastSavedSet} saved!
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View className="px-5 pb-8 pt-3 border-t border-slate-800">
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="bg-orange-500 rounded-2xl py-4 items-center mb-3"
            accessibilityRole="button"
            accessibilityLabel="Save Set"
          >
            <Text className="text-white font-bold text-base">Save Set</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="items-center py-3"
          >
            <Text className="text-slate-500 text-sm">Change Exercise</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
  },
  tierLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
});
