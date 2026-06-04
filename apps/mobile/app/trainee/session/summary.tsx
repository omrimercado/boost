import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '@/src/stores/useSessionStore';
import type { LocalSet } from '@/src/services/SessionStore';

function formatExercise(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
  if (mins < 1) return '<1 min';
  return `${mins} min`;
}

function SetRow({ item }: { item: LocalSet }) {
  return (
    <View className="px-5 py-4 border-b border-slate-800 flex-row items-center">
      <View className="flex-1">
        <Text className="text-white font-medium text-sm">
          {formatExercise(item.exerciseName)}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          Set {item.setNumber} ·{' '}
          {item.weightKg != null ? `${item.weightKg} kg` : 'Bodyweight'} ×{' '}
          {item.reps} reps
        </Text>
      </View>
      <View className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
        <Text className="text-slate-500 text-xs">Pending</Text>
      </View>
    </View>
  );
}

export default function SessionSummaryScreen() {
  const { completedSession, isSyncing, clearCompletedSession } =
    useSessionStore();

  const handleDone = () => {
    clearCompletedSession();
    router.replace('/trainee' as never);
  };

  if (!completedSession) {
    return (
      <SafeAreaView
        className="flex-1 bg-slate-950 items-center justify-center"
        edges={['top']}
      >
        <Text className="text-slate-500 text-sm">No session data.</Text>
        <TouchableOpacity className="mt-4" onPress={handleDone}>
          <Text className="text-orange-500 font-medium">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-slate-800">
        <View className="w-9 h-9 bg-green-900/40 border border-green-800 rounded-xl items-center justify-center mr-3">
          <Ionicons name="checkmark" size={18} color="#4ade80" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">Session Complete</Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            {formatDate(completedSession.startedAt)}
          </Text>
        </View>
        {isSyncing && (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#64748b" />
            <Text className="text-slate-500 text-xs ml-2">Syncing…</Text>
          </View>
        )}
      </View>

      <FlatList
        data={completedSession.sets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SetRow item={item} />}
        ListHeaderComponent={() => (
          <View className="px-5 py-5 border-b border-slate-800">
            <View className="flex-row mb-4">
              <View className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 mr-3 items-center">
                <Text className="text-white font-black text-2xl">
                  {completedSession.sets.length}
                </Text>
                <Text className="text-slate-500 text-xs mt-0.5">Sets Logged</Text>
              </View>
              <View className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 items-center">
                <Text className="text-orange-400 font-black text-2xl">
                  {formatDuration(
                    completedSession.startedAt,
                    completedSession.endedAt
                  )}
                </Text>
                <Text className="text-slate-500 text-xs mt-0.5">Duration</Text>
              </View>
            </View>
            <View className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex-row items-center">
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#64748b"
                style={{ marginRight: 8 }}
              />
              <Text className="text-slate-500 text-xs flex-1 leading-5">
                Form scores appear here once your trainer reviews this session.
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center px-8 pt-12">
            <Text className="text-slate-500 text-sm text-center">
              No sets were logged in this session.
            </Text>
          </View>
        }
      />

      {/* Done button */}
      <View className="px-5 pb-8 pt-4 border-t border-slate-800">
        <TouchableOpacity
          onPress={handleDone}
          activeOpacity={0.85}
          className="bg-orange-500 rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
