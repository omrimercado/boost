import axios from 'axios';
import { create } from 'zustand';
import type { User } from '@boost/shared';
import { API_BASE_URL } from '../config';
import { AuthService } from '../services/AuthService';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    const [user, accessToken] = await Promise.all([
      AuthService.getUser(),
      AuthService.getAccessToken(),
    ]);
    set({
      user,
      accessToken,
      isAuthenticated: !!(user && accessToken),
      isInitialized: true,
    });
  },

  login: async (user, accessToken, refreshToken) => {
    await Promise.all([
      AuthService.storeTokens(accessToken, refreshToken),
      AuthService.storeUser(user),
    ]);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await AuthService.clearAll();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    const stored = await AuthService.getRefreshToken();
    if (!stored) {
      set({ user: null, accessToken: null, isAuthenticated: false });
      return null;
    }
    try {
      const { data } = await axios.post<{
        data: { accessToken: string; refreshToken: string };
      }>(`${API_BASE_URL}/auth/refresh`, { refreshToken: stored });
      const { accessToken, refreshToken: newRefresh } = data.data;
      await AuthService.storeTokens(accessToken, newRefresh);
      set({ accessToken, isAuthenticated: true });
      return accessToken;
    } catch {
      await AuthService.clearAll();
      set({ user: null, accessToken: null, isAuthenticated: false });
      return null;
    }
  },
}));
