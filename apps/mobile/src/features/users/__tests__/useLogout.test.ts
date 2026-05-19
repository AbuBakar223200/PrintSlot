import { act, renderHook } from '@testing-library/react-native';
import { useLogout } from '../hooks/useLogout';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('../services/usersApi', () => ({
  usersApi: { unregisterDevice: jest.fn() },
}));

jest.mock('../services/deviceId', () => ({
  getDeviceId: jest.fn(async () => 'dev-fixed-1'),
}));

const SecureStore = require('expo-secure-store') as {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const { usersApi } = require('../services/usersApi') as {
  usersApi: { unregisterDevice: jest.Mock };
};
const { getDeviceId } = require('../services/deviceId') as {
  getDeviceId: jest.Mock;
};

beforeEach(() => {
  SecureStore.__store.clear();
  SecureStore.getItemAsync.mockClear();
  SecureStore.setItemAsync.mockClear();
  SecureStore.deleteItemAsync.mockClear();
  usersApi.unregisterDevice.mockReset();
  getDeviceId.mockClear();
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'user@test.local',
      name: 'User',
      phone: null,
      role: 'CUSTOMER',
      shopId: null,
      language: 'EN',
      createdAt: '',
      updatedAt: '',
    } as never,
    accessToken: 'token',
    isAuthenticated: true,
    isHydrated: true,
  });
});

describe('useLogout', () => {
  it('skips device unregistration when no registration cache exists', async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(getDeviceId).not.toHaveBeenCalled();
    expect(usersApi.unregisterDevice).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('printslot-last-device-registration');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('unregisters the device when a registration cache exists', async () => {
    SecureStore.__store.set(
      'printslot-last-device-registration',
      JSON.stringify({ userId: 'u1', token: 'ExponentPushToken[abc]', deviceId: 'dev-fixed-1' }),
    );
    usersApi.unregisterDevice.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(usersApi.unregisterDevice).toHaveBeenCalledWith('dev-fixed-1');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('printslot-last-device-registration');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
