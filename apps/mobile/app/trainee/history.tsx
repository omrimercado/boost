import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ApiResponse, SessionListItem } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { SkeletonBlock } from '@/src/components/SkeletonBlock';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
  if (mins < 1) return '<1 min';
  return `${mins} min`;
}

function ScorePill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <View
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 4,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
        {count} {label}
      </Text>
    </View>
  );
}

function SessionSkeleton() {
  return (
    <View className="px-5 py-4 border-b border-slate-800">
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <SkeletonBlock height={14} width="40%" />
        <SkeletonBlock height={14} width="20%" />
      </View>
      <SkeletonBlock height={11} width="55%" />
    </View>
  );
}

function SessionRow({ item }: { item: SessionListItem }) {
  const hasScores =
    item.scoreSummary.green + item.scoreSummary.yellow + item.scoreSummary.red >
    0;

  return (
    <TouchableOpacity
      className="px-5 py-4 border-b border-slate-800 flex-row items-center"
      activeOpacity={0.7}
    >
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white font-medium text-sm">
            {formatDate(item.startedAt)}
          </Text>
          <Text className="text-slate-500 text-xs">
            {formatDuration(item.startedAt, item.endedAt)}
          </Text>
        </View>
        <Text className="text-slate-500 text-xs mb-2">
          {item.setCount} set{item.setCount !== 1 ? 's' : ''}
        </Text>
        {hasScores ? (
          <View className="flex-row">
            <ScorePill
              label="G"
              count={item.scoreSummary.green}
              color="#4ade80"
            />
            <ScorePill
              label="Y"
              count={item.scoreSummary.yellow}
              color="#facc15"
            />
            <ScorePill
              label="R"
              count={item.scoreSummary.red}
              color="#f87171"
            />
          </View>
        ) : (
          <Text className="text-slate-600 text-xs">No form scores yet</Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="#475569"
        style={{ marginLeft: 12 }}
      />
    </TouchableOpacity>
  );
}

export default function TraineeHistoryScreen() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await apiClient.get<
        ApiResponse<{ sessions: SessionListItem[] }>
      >('/sessions');
      setSessions(data.data.sessions);
      setError('');
    } catch {
      setError('Could not load sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">History</Text>
        {!loading && !error && (
          <Text className="text-slate-500 text-sm mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
          </Text>
        )}
      </View>

      {loading && sessions.length === 0 ? (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <SessionSkeleton key={i} />
          ))}
        </>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color="#f87171"
            style={{ marginBottom: 10 }}
          />
          <Text className="text-white font-semibold mb-2 text-center">
            Couldn't load sessions
          </Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); fetchSessions(); }}
            className="mt-2"
          >
            <Text className="text-orange-500 font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionRow item={item} />}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 pt-24">
              <View className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl items-center justify-center mb-5">
                <Ionicons name="time-outline" size={28} color="#f97316" />
              </View>
              <Text className="text-white text-lg font-semibold mb-2 text-center">
                No sessions yet
              </Text>
              <Text className="text-slate-500 text-sm text-center leading-6">
                Start logging your workouts to see your history here.
              </Text>
            </View>
          }
          contentContainerStyle={
            sessions.length === 0 ? { flex: 1 } : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
