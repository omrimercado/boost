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
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '@/src/stores/useSessionStore';

function formatExercise(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function SetLoggingScreen() {
  const { activeSession, addSet, endSession, isSyncing } = useSessionStore();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [error, setError] = useState('');
  const [lastSavedSet, setLastSavedSet] = useState<number | null>(null);

  const exercise = activeSession?.exerciseName;
  const setsForExercise =
    activeSession?.sets.filter((s) => s.exerciseName === exercise) ?? [];
  const setNumber = setsForExercise.length + 1;

  const handleSave = () => {
    setError('');
    const repsNum = parseInt(reps, 10);
    if (!reps.trim() || isNaN(repsNum) || repsNum < 1) {
      setError('Please enter a valid rep count.');
      return;
    }
    if (!exercise) return;

    const weightNum = weight.trim() ? parseFloat(weight) : null;

    addSet({
      exerciseName: exercise,
      weightKg: weightNum,
      reps: repsNum,
      setNumber,
    });

    setLastSavedSet(setNumber);
    setWeight('');
    setReps('');
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
            {error ? (
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
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Save confirmation */}
            {lastSavedSet !== null && !error ? (
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
