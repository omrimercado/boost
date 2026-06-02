import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ApiResponse } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { SkeletonBlock } from '@/src/components/SkeletonBlock';
import { useTrainerStore, type TrainerSessionItem } from '@/src/stores/useTrainerStore';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── score pill ────────────────────────────────────────────────────────────────

function ScorePill({
  label,
  count,
  tier,
}: {
  label: string;
  count: number;
  tier: 'green' | 'yellow' | 'red';
}) {
  if (count === 0) return null;
  const styles = {
    green: { bg: 'bg-green-900', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-900', text: 'text-yellow-400' },
    red: { bg: 'bg-red-900', text: 'text-red-400' },
  }[tier];
  return (
    <View className={`${styles.bg} rounded-full px-2.5 py-0.5 flex-row items-center mr-1.5`}>
      <Text className={`${styles.text} text-xs font-semibold`}>{count} {label}</Text>
    </View>
  );
}

// ── session row ───────────────────────────────────────────────────────────────

function SessionRow({ item }: { item: TrainerSessionItem }) {
  const hasRedUnread = !item.isRead && item.scoreSummary.red > 0;

  return (
    <TouchableOpacity
      className="px-5 py-4 border-b border-slate-800 active:bg-slate-900"
      onPress={() => router.push((`/trainer/session/${item.id}`) as never)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-white font-semibold text-sm">{formatDate(item.startedAt)}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{formatTime(item.startedAt)}</Text>
        </View>
        <View className="flex-row items-center">
          {hasRedUnread && (
            <View className="w-2 h-2 bg-red-500 rounded-full mr-2 mt-1" />
          )}
          <Ionicons name="chevron-forward" size={16} color="#475569" />
        </View>
      </View>

      <View className="flex-row items-center flex-wrap">
        <View className="bg-slate-800 rounded-full px-2.5 py-0.5 mr-1.5 mb-1">
          <Text className="text-slate-400 text-xs">{item.setCount} sets</Text>
        </View>
        <View className="mb-1">
          <ScorePill label="G" count={item.scoreSummary.green} tier="green" />
        </View>
        <View className="mb-1">
          <ScorePill label="Y" count={item.scoreSummary.yellow} tier="yellow" />
        </View>
        <View className="mb-1">
          <ScorePill label="R" count={item.scoreSummary.red} tier="red" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── skeleton row ──────────────────────────────────────────────────────────────

function SessionSkeleton() {
  return (
    <View className="px-5 py-4 border-b border-slate-800">
      <SkeletonBlock height={14} width="55%" style={{ marginBottom: 8 }} />
      <SkeletonBlock height={11} width="30%" style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row' }}>
        <SkeletonBlock width={60} height={22} borderRadius={11} style={{ marginRight: 6 }} />
        <SkeletonBlock width={48} height={22} borderRadius={11} style={{ marginRight: 6 }} />
        <SkeletonBlock width={48} height={22} borderRadius={11} />
      </View>
    </View>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function TraineeSessionsScreen() {
  const { traineeId } = useLocalSearchParams<{ traineeId: string }>();
  const [sessions, setSessions] = useState<TrainerSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [traineeEmail, setTraineeEmail] = useState('');
  const trainees = useTrainerStore((s) => s.trainees);

  const fetchSessions = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const { data } = await apiClient.get<
          ApiResponse<{ sessions: TrainerSessionItem[]; pagination: { total: number } }>
        >(`/trainer/trainees/${traineeId}/sessions?page=${pageNum}&limit=20`);
        setSessions((prev) => (append ? [...prev, ...data.data.sessions] : data.data.sessions));
        setTotal(data.data.pagination.total);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [traineeId]
  );

  useEffect(() => {
    const trainee = trainees.find((t) => t.traineeId === traineeId);
    if (trainee) setTraineeEmail(trainee.email);
    fetchSessions(1);
  }, [traineeId, fetchSessions, trainees]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions(1);
  };

  const handleLoadMore = () => {
    if (loadingMore || sessions.length >= total) return;
    setLoadingMore(true);
    fetchSessions(page + 1, true);
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
        <View className="flex-1">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {traineeEmail || 'Trainee Sessions'}
          </Text>
          {!loading && (
            <Text className="text-slate-500 text-xs mt-0.5">{total} session{total !== 1 ? 's' : ''}</Text>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <SessionSkeleton key={i} />
          ))}
        </>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionRow item={item} />}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#f97316" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center px-8 pt-24">
              <View className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl items-center justify-center mb-5">
                <Ionicons name="barbell-outline" size={28} color="#f97316" />
              </View>
              <Text className="text-white text-lg font-semibold mb-2">No sessions yet</Text>
              <Text className="text-slate-500 text-sm text-center leading-6">
                Sessions will appear here once your trainee starts logging workouts.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
