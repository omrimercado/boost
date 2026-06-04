import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EXERCISE_NAMES } from '@boost/shared';
import type { ExerciseName } from '@boost/shared';
import { useSessionStore } from '@/src/stores/useSessionStore';

function formatExercise(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ExerciseSelectScreen() {
  const { activeSession, setExercise } = useSessionStore();
  const [selected, setSelected] = useState<ExerciseName | null>(
    activeSession?.exerciseName ?? null
  );

  const handleStart = () => {
    if (!selected) return;
    setExercise(selected);
    router.push('/trainee/session/sets' as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={22} color="#fb923c" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">Select Exercise</Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            Choose what you'll log sets for
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {EXERCISE_NAMES.map((exercise) => {
            const isSelected = selected === exercise;
            return (
              <TouchableOpacity
                key={exercise}
                onPress={() => setSelected(exercise)}
                activeOpacity={0.8}
                style={{ width: '47%' }}
                accessibilityLabel={formatExercise(exercise)}
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  className={`rounded-2xl p-4 border ${
                    isSelected
                      ? 'bg-orange-500 border-orange-400'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <Ionicons
                    name="barbell-outline"
                    size={24}
                    color={isSelected ? '#ffffff' : '#f97316'}
                    style={{ marginBottom: 10 }}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {formatExercise(exercise)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Start Logging button */}
      <View className="px-5 pb-8 pt-4 border-t border-slate-800">
        <TouchableOpacity
          onPress={handleStart}
          disabled={!selected}
          activeOpacity={0.85}
          className={`rounded-2xl py-4 items-center ${
            selected ? 'bg-orange-500' : 'bg-slate-800'
          }`}
        >
          <Text
            className={`font-bold text-base ${
              selected ? 'text-white' : 'text-slate-600'
            }`}
          >
            {selected
              ? `Log ${formatExercise(selected)} Sets`
              : 'Select an exercise'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
