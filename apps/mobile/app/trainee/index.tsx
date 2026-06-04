import { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useSessionStore } from '@/src/stores/useSessionStore';

function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatExercise(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function TraineeLogScreen() {
  const { user, logout } = useAuthStore();
  const { activeSession, startSession, discardSession } = useSessionStore();
  const startingRef = useRef(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as never);
  };

  const handleStartSession = () => {
    // ref guard prevents double-tap creating two MMKV entries before navigation
    if (startingRef.current) return;
    startingRef.current = true;
    startSession(generateSessionId());
    router.push('/trainee/session/log' as never);
  };

  const handleResume = () => {
    if (activeSession?.exerciseName) {
      router.push('/trainee/session/sets' as never);
    } else {
      router.push('/trainee/session/log' as never);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Session',
      'All unsaved data will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => discardSession(),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-slate-800">
        <View>
          <Text
            className="text-orange-500 text-2xl font-black"
            style={{ letterSpacing: -1 }}
          >
            BOOST
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">{user?.email}</Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2"
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={16}
            color="#94a3b8"
            style={{ marginRight: 5 }}
          />
          <Text className="text-slate-400 text-sm font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-5">
        {/* Active session banner */}
        {activeSession ? (
          <>
            <View className="mt-6 bg-orange-950 border border-orange-800 rounded-2xl p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                <Text className="text-orange-400 text-xs font-semibold uppercase tracking-wider">
                  Session in progress
                </Text>
              </View>
              {activeSession.exerciseName ? (
                <Text className="text-white font-medium text-sm mb-1">
                  {formatExercise(activeSession.exerciseName)}
                </Text>
              ) : null}
              <Text className="text-slate-400 text-xs mb-4">
                {activeSession.sets.length} set
                {activeSession.sets.length !== 1 ? 's' : ''} logged
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={handleResume}
                  className="flex-1 bg-orange-500 rounded-xl py-3 items-center mr-2"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-bold text-sm">Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDiscard}
                  className="bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-slate-400 text-sm">Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-1 items-center justify-center">
              <Text className="text-slate-500 text-sm text-center leading-6">
                End your current session before starting a new one.
              </Text>
            </View>
          </>
        ) : (
          /* Start Session CTA */
          <View className="flex-1 items-center justify-center">
            <View className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-3xl items-center justify-center mb-6">
              <Ionicons name="barbell-outline" size={36} color="#f97316" />
            </View>
            <Text className="text-white text-2xl font-bold mb-2 text-center">
              Ready to train?
            </Text>
            <Text className="text-slate-500 text-sm text-center leading-6 mb-8 px-4">
              Log your sets, track your progress, and get AI form feedback from
              your trainer.
            </Text>
            <TouchableOpacity
              onPress={handleStartSession}
              activeOpacity={0.85}
              className="bg-orange-500 rounded-2xl px-10 py-4 items-center"
            >
              <Text className="text-white font-bold text-base">
                Start Session
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
