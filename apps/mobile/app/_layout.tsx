import '../global.css';
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useSessionStore } from '@/src/stores/useSessionStore';
import { loadActiveSession } from '@/src/services/SessionStore';

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);
  const { initFromStorage, discardSession } = useSessionStore();

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveredExercise, setRecoveredExercise] = useState<string | null>(
    null
  );

  // Runs on every app start, including deep-link entry — must be at root scope.
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Role guard is load-bearing: prevents modal from showing for trainer accounts.
  useEffect(() => {
    if (!isInitialized || user?.role !== 'trainee') return;
    const session = loadActiveSession();
    if (session && !session.endedAt) {
      initFromStorage();
      setRecoveredExercise(session.exerciseName);
      setShowRecovery(true);
    }
  }, [isInitialized, user?.role, initFromStorage]);

  const handleResume = () => {
    setShowRecovery(false);
    if (recoveredExercise) {
      router.push('/trainee/session/sets' as never);
    } else {
      router.push('/trainee/session/log' as never);
    }
  };

  const handleDiscard = () => {
    discardSession();
    setShowRecovery(false);
    setRecoveredExercise(null);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="trainer" />
        <Stack.Screen name="trainee" />
      </Stack>

      {/* Crash recovery modal — shown when app restarts mid-session */}
      <Modal
        visible={showRecovery}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#0f172a',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: '#1e293b',
              width: '100%',
              maxWidth: 360,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                backgroundColor: '#431407',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="barbell-outline" size={24} color="#f97316" />
            </View>

            <Text
              style={{
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 8,
              }}
            >
              Unfinished Session
            </Text>
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 14,
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              You have a workout that wasn't completed. Would you like to resume
              where you left off?
            </Text>

            <TouchableOpacity
              onPress={handleResume}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#f97316',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text
                style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}
              >
                Resume Session
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDiscard}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: '#64748b', fontSize: 14 }}>
                Discard & Start Fresh
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
