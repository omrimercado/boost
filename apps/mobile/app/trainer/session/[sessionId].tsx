import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ApiResponse, SessionSet, FormScore } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { useTrainerStore } from '@/src/stores/useTrainerStore';
import { SkeletonBlock } from '@/src/components/SkeletonBlock';

// ── types ─────────────────────────────────────────────────────────────────────

interface SetWithScore extends SessionSet {
  formScore: FormScore | null;
}

interface SessionDetail {
  id: string;
  traineeId: string;
  startedAt: string;
  endedAt: string | null;
  isRead: boolean;
  sets: SetWithScore[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatExercise(name: string): string {
  return name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${mins} min`;
}

// ── score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ tier }: { tier: 'green' | 'yellow' | 'red' }) {
  const map = {
    green: { bg: 'bg-green-900', border: 'border-green-800', text: 'text-green-400', label: 'Good Form' },
    yellow: { bg: 'bg-yellow-900', border: 'border-yellow-800', text: 'text-yellow-400', label: 'Needs Work' },
    red: { bg: 'bg-red-900', border: 'border-red-800', text: 'text-red-400', label: 'Poor Form' },
  }[tier];
  return (
    <View className={`${map.bg} border ${map.border} rounded-full px-3 py-1`}>
      <Text className={`${map.text} text-xs font-semibold`}>{map.label}</Text>
    </View>
  );
}

// ── set row ───────────────────────────────────────────────────────────────────

function SetRow({ item }: { item: SetWithScore }) {
  const [expanded, setExpanded] = useState(false);
  const hasScore = !!item.formScore;

  return (
    <View className="px-5 py-4 border-b border-slate-800">
      {/* Top row: exercise + set number + weight×reps */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-white font-semibold text-sm">
            {formatExercise(item.exerciseName)}
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Set {item.setNumber} ·{' '}
            {item.weightKg != null ? `${item.weightKg} kg` : 'Bodyweight'} × {item.reps} reps
          </Text>
        </View>
        {hasScore ? (
          <ScoreBadge tier={item.formScore!.scoreTier} />
        ) : (
          <View className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
            <Text className="text-slate-500 text-xs">No form data</Text>
          </View>
        )}
      </View>

      {/* Coaching text (expandable) */}
      {hasScore && item.formScore!.coachingText ? (
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-center mt-1"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#64748b"
            style={{ marginRight: 5 }}
          />
          <Text className="text-slate-500 text-xs font-medium">
            {expanded ? 'Hide coaching' : 'Show coaching'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {expanded && item.formScore?.coachingText ? (
        <View className="mt-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
          <Text className="text-slate-300 text-sm leading-6">{item.formScore.coachingText}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function SetSkeleton() {
  return (
    <View className="px-5 py-4 border-b border-slate-800">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <SkeletonBlock height={14} width="45%" />
        <SkeletonBlock width={80} height={26} borderRadius={13} />
      </View>
      <SkeletonBlock height={11} width="35%" />
    </View>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const decrementRedAlert = useTrainerStore((s) => s.decrementRedAlert);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      try {
        const { data } = await apiClient.get<ApiResponse<{ session: SessionDetail }>>(
          `/trainer/sessions/${sessionId}`
        );
        setSession(data.data.session);

        const wasAlreadyRead = data.data.session.isRead;
        await apiClient.patch(`/trainer/sessions/${sessionId}/read`);
        if (!wasAlreadyRead && data.data.session.sets.some((s) => s.formScore?.scoreTier === 'red')) {
          decrementRedAlert(data.data.session.traineeId);
        }
      } catch {
        setError('Could not load session. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId, decrementRedAlert]);

  const renderHeader = () => {
    if (!session) return null;
    const totalSets = session.sets.length;
    const scored = session.sets.filter((s) => s.formScore).length;
    return (
      <View className="px-5 py-5 border-b border-slate-800">
        <Text className="text-white font-bold text-lg mb-1">{formatDate(session.startedAt)}</Text>
        <Text className="text-slate-500 text-sm mb-4">
          {formatTime(session.startedAt)} · {formatDuration(session.startedAt, session.endedAt)}
        </Text>
        <View className="flex-row">
          <View className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 mr-2 items-center">
            <Text className="text-white font-bold text-lg">{totalSets}</Text>
            <Text className="text-slate-500 text-xs">Sets</Text>
          </View>
          <View className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 mr-2 items-center">
            <Text className="text-green-400 font-bold text-lg">
              {session.sets.filter((s) => s.formScore?.scoreTier === 'green').length}
            </Text>
            <Text className="text-slate-500 text-xs">Green</Text>
          </View>
          <View className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 mr-2 items-center">
            <Text className="text-yellow-400 font-bold text-lg">
              {session.sets.filter((s) => s.formScore?.scoreTier === 'yellow').length}
            </Text>
            <Text className="text-slate-500 text-xs">Yellow</Text>
          </View>
          <View className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 items-center">
            <Text className="text-red-400 font-bold text-lg">
              {session.sets.filter((s) => s.formScore?.scoreTier === 'red').length}
            </Text>
            <Text className="text-slate-500 text-xs">Red</Text>
          </View>
          {scored > 0 && (
            <View className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 ml-2 items-center">
              <Text className="text-orange-400 font-bold text-lg">{scored}</Text>
              <Text className="text-slate-500 text-xs">Scored</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mr-3"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#fb923c" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-base flex-1">Session Detail</Text>
      </View>

      {loading ? (
        <>
          <View className="px-5 py-5 border-b border-slate-800">
            <SkeletonBlock height={18} width="50%" style={{ marginBottom: 8 }} />
            <SkeletonBlock height={12} width="35%" style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} width={60} height={56} borderRadius={12} style={{ marginRight: 8 }} />
              ))}
            </View>
          </View>
          {Array.from({ length: 4 }).map((_, i) => (
            <SetSkeleton key={i} />
          ))}
        </>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={40} color="#f87171" style={{ marginBottom: 12 }} />
          <Text className="text-white text-lg font-semibold mb-2">Failed to load</Text>
          <Text className="text-slate-500 text-sm text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={session?.sets ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SetRow item={item} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View className="items-center justify-center px-8 pt-16">
              <Text className="text-slate-500 text-sm text-center">No sets logged in this session.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
