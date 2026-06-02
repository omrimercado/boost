import { useState, forwardRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoComplete?: 'password' | 'new-password' | 'current-password';
  returnKeyType?: 'done' | 'next' | 'go';
  onSubmitEditing?: () => void;
  className?: string;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  (
    {
      label,
      value,
      onChangeText,
      placeholder = 'Enter password',
      autoComplete = 'password',
      returnKeyType = 'done',
      onSubmitEditing,
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);

    return (
      <View className="mb-5">
        <Text className="text-slate-400 text-sm font-medium mb-2">{label}</Text>
        <View>
          <TextInput
            ref={ref}
            className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white text-base"
            placeholder={placeholder}
            placeholderTextColor="#475569"
            secureTextEntry={!visible}
            autoComplete={autoComplete}
            returnKeyType={returnKeyType}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditing}
            style={{ paddingRight: 52 }}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 16, top: 16 }}
            onPress={() => setVisible((v) => !v)}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
