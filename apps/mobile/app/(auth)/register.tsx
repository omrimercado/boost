import { useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthResponse, ApiResponse } from '@boost/shared';
import { apiClient } from '@/src/services/api';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { extractApiError } from '@/src/utils/apiError';
import { PasswordInput } from '@/src/components/PasswordInput';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const login = useAuthStore((s) => s.login);

  const handleRegister = async () => {
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
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
          <View className="px-6 pt-6 pb-8">
            {/* Back */}
            <TouchableOpacity
              className="flex-row items-center mb-8"
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color="#fb923c" />
              <Text className="text-orange-400 text-sm font-medium ml-1">
                Back
              </Text>
            </TouchableOpacity>

            {/* Heading */}
            <Text className="text-white text-3xl font-bold mb-1">
              Become a Trainer
            </Text>
            <Text className="text-slate-500 text-base mb-8">
              Create your trainer account to get started
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
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password */}
            <PasswordInput
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
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
              onSubmitEditing={handleRegister}
            />

            {/* Password hint */}
            <View className="flex-row items-center mb-6 -mt-2">
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#475569"
                style={{ marginRight: 4 }}
              />
              <Text className="text-slate-600 text-xs">
                Minimum 8 characters
              </Text>
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
              className={`rounded-2xl py-4 items-center mb-6 ${
                loading ? 'bg-orange-800' : 'bg-orange-500'
              }`}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">
                  Create Trainer Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <TouchableOpacity
              className="py-3 items-center"
              onPress={() => router.back()}
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
