import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import type { AuthResponse, ApiResponse } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { extractApiError } from '@/src/utils/apiError';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleRegister = async () => {
    setError('');
    if (!email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
        '/auth/register',
        { email: email.trim(), password, role: 'trainer' }
      );
      const { user, accessToken, refreshToken } = data.data;
      await login(user, accessToken, refreshToken);
      router.replace('/trainer' as never);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-8">
          <TouchableOpacity
            className="mb-6"
            onPress={() => router.back()}
          >
            <Text className="text-blue-600">← Back</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold mb-2 text-gray-900">
            Create Account
          </Text>
          <Text className="text-base text-gray-500 mb-8">
            Register as a trainer
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
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900 bg-gray-50"
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 bg-gray-50"
            placeholder="Confirm Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onSubmitEditing={handleRegister}
          />

          {error ? (
            <Text className="text-red-500 mb-4 text-sm text-center">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            className="bg-blue-600 rounded-xl py-4 items-center"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Create Trainer Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
