/// <reference types="nativewind/types" />

// Allow CSS side-effect imports (e.g. global.css) used by NativeWind
declare module '*.css' {}

// Expose process.env for Expo's EXPO_PUBLIC_* build-time env var substitution
declare const process: {
  env: Record<string, string | undefined>;
};
