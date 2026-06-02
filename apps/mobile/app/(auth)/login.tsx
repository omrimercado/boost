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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
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
      router.replace((user.role === 'trainer' ? '/trainer' : '/trainee') as never);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Incorrect email or password.'));
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
          <View className="flex-1 px-6 pt-14 pb-8">
            {/* Brand */}
            <View className="mb-12">
              <Text
                className="text-orange-500 text-5xl font-black"
                style={{ letterSpacing: -2 }}
              >
                BOOST
              </Text>
              <Text className="text-slate-500 text-sm mt-1 tracking-wide uppercase">
                AI Fitness Coaching
              </Text>
            </View>

            {/* Heading */}
            <Text className="text-white text-3xl font-bold mb-1">
              Welcome back
            </Text>
            <Text className="text-slate-500 text-base mb-8">
              Sign in to continue your training
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
              placeholder="Enter your password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              className="self-end -mt-3 mb-6"
              onPress={() => router.push('/(auth)/forgot-password' as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-orange-400 text-sm font-medium">
                Forgot password?
              </Text>
            </TouchableOpacity>

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
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <TouchableOpacity
              className="py-3 items-center"
              onPress={() => router.push('/(auth)/register' as never)}
            >
              <Text className="text-slate-500 text-sm">
                New trainer?{' '}
                <Text className="text-orange-400 font-semibold">
                  Create an account
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
