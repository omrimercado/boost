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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/src/services/api';
import { extractApiError } from '@/src/utils/apiError';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center px-6">
          {/* Success icon */}
          <View className="w-20 h-20 bg-orange-500 rounded-full items-center justify-center mb-8 self-start">
            <Ionicons name="mail-outline" size={36} color="#ffffff" />
          </View>

          <Text className="text-white text-3xl font-bold mb-3">
            Check your inbox
          </Text>
          <Text className="text-slate-400 text-base leading-7 mb-2">
            We sent a reset link to
          </Text>
          <Text className="text-orange-400 font-semibold text-base mb-8">
            {email}
          </Text>
          <Text className="text-slate-500 text-sm leading-6 mb-10">
            Click the link in the email to reset your password. The link expires
            in 1 hour.
          </Text>

          <TouchableOpacity
            className="bg-orange-500 rounded-2xl py-4 items-center mb-4"
            onPress={() => router.replace('/(auth)/login' as never)}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base tracking-wide">
              Back to Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-3 items-center"
            onPress={() => setSubmitted(false)}
          >
            <Text className="text-slate-500 text-sm">
              Wrong email?{' '}
              <Text className="text-orange-400 font-semibold">Try again</Text>
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
        <View className="flex-1 px-6 pt-6">
          {/* Back */}
          <TouchableOpacity
            className="flex-row items-center mb-10"
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fb923c" />
            <Text className="text-orange-400 text-sm font-medium ml-1">
              Back
            </Text>
          </TouchableOpacity>

          {/* Icon */}
          <View className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl items-center justify-center mb-6">
            <Ionicons name="lock-closed-outline" size={24} color="#f97316" />
          </View>

          <Text className="text-white text-3xl font-bold mb-2">
            Forgot password?
          </Text>
          <Text className="text-slate-500 text-base mb-8 leading-6">
            No worries — enter your email and we'll send you a reset link.
          </Text>

          {/* Email */}
          <View className="mb-5">
            <Text className="text-slate-400 text-sm font-medium mb-2">
              Email address
            </Text>
            <TextInput
              className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white text-base"
              placeholder="you@example.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="go"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSubmit}
            />
          </View>

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
            className={`rounded-2xl py-4 items-center ${
              loading ? 'bg-orange-800' : 'bg-orange-500'
            }`}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base tracking-wide">
                Send Reset Link
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
