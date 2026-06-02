import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/useAuthStore';

export default function TraineeHomeScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-5 flex-row items-center justify-between border-b border-slate-800">
        <View>
          <Text
            className="text-orange-500 text-2xl font-black"
            style={{ letterSpacing: -1 }}
          >
            BOOST
          </Text>
          <Text className="text-slate-400 text-sm mt-0.5">
            {user?.email}
          </Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5"
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={16}
            color="#94a3b8"
            style={{ marginRight: 6 }}
          />
          <Text className="text-slate-400 text-sm font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Page title */}
      <View className="px-6 pt-6 pb-2">
        <Text className="text-white text-2xl font-bold">My Sessions</Text>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl items-center justify-center mb-5">
          <Ionicons name="barbell-outline" size={28} color="#f97316" />
        </View>
        <Text className="text-white text-lg font-semibold mb-2 text-center">
          Ready to train?
        </Text>
        <Text className="text-slate-500 text-sm text-center leading-6">
          Session logging is coming in the next update.
        </Text>
      </View>
    </SafeAreaView>
  );
}
