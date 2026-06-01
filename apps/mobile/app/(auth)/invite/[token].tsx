import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { InviteInfoResponse, AuthResponse, ApiResponse } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { extractApiError } from '@/src/utils/apiError';

export default function InviteRegisterScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [inviteInfo, setInviteInfo] = useState<InviteInfoResponse | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
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
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
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
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (invalidToken || !inviteInfo) {
    return (
      <View className="flex-1 bg-white justify-center px-6">
        <Text className="text-3xl font-bold mb-4 text-gray-900">
          Invalid Link
        </Text>
        <Text className="text-gray-500 mb-8">
          This invite link is invalid or has expired. Ask your trainer to send a
          new invite.
        </Text>
        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center"
          onPress={() => router.replace('/(auth)/login' as never)}
        >
          <Text className="text-white font-semibold text-base">
            Go to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold mb-2 text-gray-900">
          You&apos;re Invited!
        </Text>
        <Text className="text-gray-500 mb-8 leading-6">
          <Text className="font-semibold text-gray-800">
            {inviteInfo.trainerName}
          </Text>{' '}
          invited you to Boost. Create a password to get started.
        </Text>

        <View className="border border-gray-300 rounded-xl px-4 py-3 mb-4 bg-gray-100">
          <Text className="text-gray-500 text-xs mb-1">Email</Text>
          <Text className="text-gray-700">{inviteInfo.inviteEmail}</Text>
        </View>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 bg-gray-50"
          placeholder="Create a password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleAccept}
        />

        {error ? (
          <Text className="text-red-500 mb-4 text-sm text-center">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center"
          onPress={handleAccept}
          disabled={loadingSubmit}
        >
          {loadingSubmit ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Join Boost
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
