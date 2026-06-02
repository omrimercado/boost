import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { InviteInfoResponse, AuthResponse, ApiResponse } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { extractApiError } from '@/src/utils/apiError';
import { PasswordInput } from '@/src/components/PasswordInput';

export default function InviteRegisterScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [inviteInfo, setInviteInfo] = useState<InviteInfoResponse | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (!token) return;
    apiClient
      .get<ApiResponse<InviteInfoResponse>>(`/invites/${token}`)
      .then(({ data }) => setInviteInfo(data.data))
      .catch(() => setInvalidToken(true))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleAccept = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoadingSubmit(true);
    try {
      const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
        `/invites/${token}/accept`,
        { password }
      );
      const { user, accessToken, refreshToken } = data.data;
      await login(user, accessToken, refreshToken);
      router.replace('/trainee' as never);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Failed to accept invite. Please try again.'));
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingInfo) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-slate-500 text-sm mt-4">Loading your invite…</Text>
      </SafeAreaView>
    );
  }

  if (invalidToken || !inviteInfo) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center px-6">
          <View className="w-16 h-16 bg-red-950 border border-red-900 rounded-2xl items-center justify-center mb-6">
            <Ionicons name="link-outline" size={28} color="#f87171" />
          </View>
          <Text className="text-white text-3xl font-bold mb-3">
            Invalid link
          </Text>
          <Text className="text-slate-400 text-base leading-7 mb-10">
            This invite link is no longer valid or has already been used. Ask
            your trainer to send a new invite.
          </Text>
          <TouchableOpacity
            className="bg-orange-500 rounded-2xl py-4 items-center"
            onPress={() => router.replace('/(auth)/login' as never)}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base tracking-wide">
              Go to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pt-10 pb-8">
            {/* Invitation card */}
            <View className="bg-slate-900 border border-slate-700 rounded-3xl p-5 mb-8">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-orange-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="fitness-outline" size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                    Trainer invitation
                  </Text>
                  <Text className="text-white font-bold text-base">
                    {inviteInfo.trainerName}
                  </Text>
                </View>
              </View>
              <View className="h-px bg-slate-800 mb-3" />
              <Text className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                Invited email
              </Text>
              <Text className="text-slate-300 text-sm font-medium">
                {inviteInfo.inviteEmail}
              </Text>
            </View>

            {/* Heading */}
            <Text className="text-white text-3xl font-bold mb-2">
              You're invited!
            </Text>
            <Text className="text-slate-500 text-base mb-8 leading-6">
              Create a password to join{' '}
              <Text className="text-slate-300 font-semibold">
                {inviteInfo.trainerName}
              </Text>
              's team on Boost.
            </Text>

            {/* Password */}
            <PasswordInput
              label="Create a password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />

            {/* Confirm Password */}
            <PasswordInput
              ref={confirmRef}
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={handleAccept}
            />

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

            {/* Submit */}
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center mb-6 ${
                loadingSubmit ? 'bg-orange-800' : 'bg-orange-500'
              }`}
              onPress={handleAccept}
              disabled={loadingSubmit}
              activeOpacity={0.85}
            >
              {loadingSubmit ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">
                  Join Boost
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 items-center"
              onPress={() => router.replace('/(auth)/login' as never)}
            >
              <Text className="text-slate-500 text-sm">
                Already have an account?{' '}
                <Text className="text-orange-400 font-semibold">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
