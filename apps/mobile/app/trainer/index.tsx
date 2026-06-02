import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ApiResponse } from '@boost/shared';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTrainerStore, type TraineeRow } from '@/src/stores/useTrainerStore';
import { apiClient } from '@/src/services/api';
import { extractApiError } from '@/src/utils/apiError';
import { SkeletonBlock } from '@/src/components/SkeletonBlock';
import type { TrainerSessionItem } from '@/src/stores/useTrainerStore';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitial(email: string): string {
  return (email[0] ?? '?').toUpperCase();
}

// ── skeleton row ─────────────────────────────────────────────────────────────

function TraineeSkeleton() {
  return (
    <View className="flex-row items-center px-5 py-4 border-b border-slate-800">
      <SkeletonBlock width={44} height={44} borderRadius={22} style={{ marginRight: 14 }} />
      <View className="flex-1">
        <SkeletonBlock height={14} width="60%" style={{ marginBottom: 8 }} />
        <SkeletonBlock height={11} width="35%" />
      </View>
    </View>
  );
}

// ── trainee row ───────────────────────────────────────────────────────────────

function TraineeRowItem({
  item,
  onBadgePress,
}: {
  item: TraineeRow;
  onBadgePress: (traineeId: string) => void;
}) {
  const isPending = item.status === 'pending';
  const hasRedAlert = !isPending && item.unreadRedAlertCount > 0;

  const handlePress = () => {
    if (!isPending && item.traineeId) {
      router.push((`/trainer/trainee/${item.traineeId}`) as never);
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center px-5 py-4 border-b border-slate-800 ${isPending ? 'opacity-60' : ''}`}
      onPress={handlePress}
      disabled={isPending}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View className="w-11 h-11 rounded-full bg-slate-700 items-center justify-center mr-4">
        <Text className="text-white font-bold text-base">{getInitial(item.email)}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-white font-medium text-sm mb-1" numberOfLines={1}>
          {item.email}
        </Text>
        {isPending ? (
          <View className="flex-row items-center">
            <View className="bg-slate-700 rounded-full px-2 py-0.5">
              <Text className="text-slate-400 text-xs">Invited · Pending</Text>
            </View>
          </View>
        ) : (
          <Text className="text-slate-500 text-xs">
            {item.lastSessionAt ? `Last session ${formatRelativeDate(item.lastSessionAt)}` : 'No sessions yet'}
          </Text>
        )}
      </View>

      {/* Red alert badge */}
      {hasRedAlert ? (
        <TouchableOpacity
          className="w-8 h-8 bg-red-500 rounded-full items-center justify-center ml-3"
          onPress={() => item.traineeId && onBadgePress(item.traineeId)}
          accessibilityLabel={`${item.unreadRedAlertCount} unread red alert${item.unreadRedAlertCount > 1 ? 's' : ''}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-white text-xs font-bold">
            {item.unreadRedAlertCount > 9 ? '9+' : item.unreadRedAlertCount}
          </Text>
        </TouchableOpacity>
      ) : (
        !isPending && (
          <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 12 }} />
        )
      )}
    </TouchableOpacity>
  );
}

// ── add trainee sheet ─────────────────────────────────────────────────────────

function AddTraineeSheet({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setEmail('');
    setError('');
    setLoading(false);
    setSent(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = async () => {
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post<ApiResponse<unknown>>('/invites', { email: email.trim() });
      setSent(true);
      onSuccess();
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Failed to send invite. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable className="flex-1" onPress={handleClose} />
        <View className="bg-slate-900 border-t border-slate-700 rounded-t-3xl px-6 pt-4 pb-10">
          {/* Handle */}
          <View className="w-10 h-1 bg-slate-600 rounded-full self-center mb-5" />

          <Text className="text-white text-xl font-bold mb-1">Add Trainee</Text>
          <Text className="text-slate-500 text-sm mb-6">
            We'll send them an invite link via email.
          </Text>

          {sent ? (
            <View className="bg-green-950 border border-green-800 rounded-2xl px-4 py-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#4ade80" style={{ marginRight: 10 }} />
              <Text className="text-green-400 font-medium">Invite sent to {email}</Text>
            </View>
          ) : (
            <>
              <View className="mb-5">
                <Text className="text-slate-400 text-sm font-medium mb-2">Trainee email</Text>
                <TextInput
                  className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white text-base"
                  placeholder="trainee@example.com"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
              </View>

              {error ? (
                <View className="bg-red-950 border border-red-900 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#f87171"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-red-400 text-sm flex-1" accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                className={`rounded-2xl py-4 items-center ${loading ? 'bg-orange-800' : 'bg-orange-500'}`}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">Send Invite</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function TrainerHomeScreen() {
  const { user, logout } = useAuthStore();
  const { trainees, loadingTrainees, fetchTrainees } = useTrainerStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    fetchTrainees();
  }, [fetchTrainees]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrainees();
    setRefreshing(false);
  }, [fetchTrainees]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as never);
  };

  const handleBadgePress = async (traineeId: string) => {
    try {
      const { data } = await apiClient.get<
        ApiResponse<{ sessions: TrainerSessionItem[] }>
      >(`/trainer/trainees/${traineeId}/sessions?limit=50`);
      const target = data.data.sessions.find((s) => !s.isRead && s.scoreSummary.red > 0);
      if (target) {
        router.push((`/trainer/session/${target.id}`) as never);
      } else {
        router.push((`/trainer/trainee/${traineeId}`) as never);
      }
    } catch {
      router.push((`/trainer/trainee/${traineeId}`) as never);
    }
  };

  const skeletonCount = 5;

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-slate-800">
        <View>
          <Text className="text-orange-500 text-2xl font-black" style={{ letterSpacing: -1 }}>
            BOOST
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">{user?.email}</Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2"
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#94a3b8" style={{ marginRight: 5 }} />
          <Text className="text-slate-400 text-sm font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Title row */}
      <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">My Trainees</Text>
          {!loadingTrainees && (
            <Text className="text-slate-500 text-sm mt-0.5">
              {trainees.filter((t) => t.status === 'active').length} active
            </Text>
          )}
        </View>
        <TouchableOpacity
          className="w-10 h-10 bg-orange-500 rounded-full items-center justify-center"
          onPress={() => setSheetVisible(true)}
          accessibilityLabel="Add trainee"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loadingTrainees && trainees.length === 0 ? (
        <>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <TraineeSkeleton key={i} />
          ))}
        </>
      ) : (
        <FlatList
          data={trainees}
          keyExtractor={(item) => item.linkId}
          renderItem={({ item }) => (
            <TraineeRowItem item={item} onBadgePress={handleBadgePress} />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 pt-24">
              <View className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl items-center justify-center mb-5">
                <Ionicons name="people-outline" size={28} color="#f97316" />
              </View>
              <Text className="text-white text-lg font-semibold mb-2 text-center">
                No trainees yet
              </Text>
              <Text className="text-slate-500 text-sm text-center leading-6 mb-6">
                Tap the + button to invite your first trainee.
              </Text>
              <TouchableOpacity
                className="bg-orange-500 rounded-2xl px-6 py-3"
                onPress={() => setSheetVisible(true)}
                activeOpacity={0.85}
              >
                <Text className="text-white font-bold">Invite Trainee</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={trainees.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      {/* Add Trainee sheet */}
      <AddTraineeSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSuccess={fetchTrainees}
      />
    </SafeAreaView>
  );
}
