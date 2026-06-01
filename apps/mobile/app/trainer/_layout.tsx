import { Tabs } from 'expo-router';

export default function TrainerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Trainees' }}
      />
    </Tabs>
  );
}
