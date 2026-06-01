import * as Keychain from 'react-native-keychain';
import type { User } from '@boost/shared';

const SERVICES = {
  ACCESS_TOKEN: 'boost_access_token',
  REFRESH_TOKEN: 'boost_refresh_token',
  USER: 'boost_user',
} as const;

export const AuthService = {
  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      Keychain.setGenericPassword('token', accessToken, {
        service: SERVICES.ACCESS_TOKEN,
      }),
      Keychain.setGenericPassword('token', refreshToken, {
        service: SERVICES.REFRESH_TOKEN,
      }),
    ]);
  },

  async storeUser(user: User): Promise<void> {
    await Keychain.setGenericPassword('user', JSON.stringify(user), {
      service: SERVICES.USER,
    });
  },

  async getAccessToken(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service: SERVICES.ACCESS_TOKEN,
    });
    return result ? result.password : null;
  },

  async getRefreshToken(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service: SERVICES.REFRESH_TOKEN,
    });
    return result ? result.password : null;
  },

  async getUser(): Promise<User | null> {
    const result = await Keychain.getGenericPassword({ service: SERVICES.USER });
    if (!result) return null;
    try {
      return JSON.parse(result.password) as User;
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      Keychain.resetGenericPassword({ service: SERVICES.ACCESS_TOKEN }),
      Keychain.resetGenericPassword({ service: SERVICES.REFRESH_TOKEN }),
      Keychain.resetGenericPassword({ service: SERVICES.USER }),
    ]);
  },
};
