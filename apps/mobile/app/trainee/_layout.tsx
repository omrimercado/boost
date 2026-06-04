import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TAB_BAR_STYLE = {
  backgroundColor: '#0f172a',
  borderTopColor: '#1e293b',
  borderTopWidth: 1,
};

const HIDDEN_SCREEN_OPTIONS = {
  href: null as null,
  tabBarStyle: { display: 'none' as const },
};

export default function TraineeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: TAB_BAR_STYLE,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="session/log" options={HIDDEN_SCREEN_OPTIONS} />
      <Tabs.Screen name="session/sets" options={HIDDEN_SCREEN_OPTIONS} />
      <Tabs.Screen name="session/summary" options={HIDDEN_SCREEN_OPTIONS} />
    </Tabs>
  );
}
