import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/src/stores/useAuthStore';

export default function TraineeHomeScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as never);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="pt-16 pb-4 px-6 border-b border-gray-200 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Sessions</Text>
          <Text className="text-sm text-gray-500 mt-1">{user?.email}</Text>
        </View>
        <TouchableOpacity
          className="bg-gray-100 rounded-lg px-4 py-2"
          onPress={handleLogout}
        >
          <Text className="text-gray-600 font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-400 text-center">
          Session logging coming soon.
        </Text>
      </View>
    </View>
  );
}
