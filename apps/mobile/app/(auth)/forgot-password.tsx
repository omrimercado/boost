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
import { apiClient } from '@/src/services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-white justify-center px-6">
        <Text className="text-3xl font-bold mb-4 text-gray-900">
          Check your email
        </Text>
        <Text className="text-gray-500 mb-8 leading-6">
          We sent a password reset link to{' '}
          <Text className="font-medium text-gray-800">{email}</Text>. Follow the
          link in the email to reset your password.
        </Text>
        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center"
          onPress={() => router.replace('/(auth)/login' as never)}
        >
          <Text className="text-white font-semibold text-base">
            Back to Sign In
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
        <TouchableOpacity className="mb-6" onPress={() => router.back()}>
          <Text className="text-blue-600">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold mb-2 text-gray-900">
          Reset Password
        </Text>
        <Text className="text-base text-gray-500 mb-8">
          Enter your email and we&apos;ll send you a reset link.
        </Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900 bg-gray-50"
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleSubmit}
        />

        {error ? (
          <Text className="text-red-500 mb-4 text-sm text-center">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center"
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Send Reset Link
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
