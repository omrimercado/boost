/// <reference types="nativewind/types" />

// Expose process.env for Expo's EXPO_PUBLIC_* build-time env var substitution
declare const process: {
  env: Record<string, string | undefined>;
};
