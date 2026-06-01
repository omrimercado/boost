import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import type { AuthResponse, ApiResponse } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { extractApiError } from '@/src/utils/apiError';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
        '/auth/login',
        { email: email.trim(), password }
      );
      const { user, accessToken, refreshToken } = data.data;
      await login(user, accessToken, refreshToken);
      if (user.role === 'trainer') {
        router.replace('/trainer' as never);
      } else {
        router.replace('/trainee' as never);
      }
    } catch (err: unknown) {
      setError(extractApiError(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold mb-2 text-gray-900">Boost</Text>
        <Text className="text-base text-gray-500 mb-8">
          Sign in to your account
        </Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 bg-gray-50"
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-2 text-gray-900 bg-gray-50"
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          className="self-end mb-6"
          onPress={() => router.push('/(auth)/forgot-password' as never)}
        >
          <Text className="text-blue-600 text-sm">Forgot password?</Text>
        </TouchableOpacity>

        {error ? (
          <Text className="text-red-500 mb-4 text-sm text-center">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center mb-4"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="py-2 items-center"
          onPress={() => router.push('/(auth)/register' as never)}
        >
          <Text className="text-gray-500 text-sm">
            New trainer?{' '}
            <Text className="text-blue-600 font-medium">Register here</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
