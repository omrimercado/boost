import axios from 'axios';
import { router } from 'expo-router';
import { API_BASE_URL } from '../config';
import { AuthService } from './AuthService';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AuthService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type PendingItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let isRefreshing = false;
let pendingQueue: PendingItem[] = [];

function flushQueue(err: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) =>
    err ? reject(err) : resolve(token!)
  );
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await AuthService.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token stored');

      const { data } = await axios.post<{
        data: { accessToken: string; refreshToken: string };
      }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });

      const { accessToken, refreshToken: newRefresh } = data.data;
      await AuthService.storeTokens(accessToken, newRefresh);

      // Persist new token as the default so queued and future requests don't need to re-read keychain
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      flushQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (refreshErr) {
      flushQueue(refreshErr, null);
      await AuthService.clearAll();
      router.replace('/(auth)/login' as never);
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
