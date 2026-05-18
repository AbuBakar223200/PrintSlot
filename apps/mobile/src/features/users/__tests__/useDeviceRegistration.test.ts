import { registerDeviceOnce } from '../hooks/useDeviceRegistration';

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

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} }, easConfig: undefined },
}));

jest.mock('../services/usersApi', () => ({
  usersApi: { registerDevice: jest.fn() },
}));

jest.mock('../services/deviceId', () => ({
  getDeviceId: jest.fn(async () => 'dev-fixed-1'),
}));

const Notifications = require('expo-notifications') as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
};
const SecureStore = require('expo-secure-store') as {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
};
const { usersApi } = require('../services/usersApi') as {
  usersApi: { registerDevice: jest.Mock };
};

beforeEach(() => {
  SecureStore.__store.clear();
  Notifications.getPermissionsAsync.mockReset();
  Notifications.requestPermissionsAsync.mockReset();
  Notifications.getExpoPushTokenAsync.mockReset();
  usersApi.registerDevice.mockReset();
});

describe('registerDeviceOnce', () => {
  it('registers the device when permission is granted and no cache exists', async () => {
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
    usersApi.registerDevice.mockResolvedValueOnce({});

    await registerDeviceOnce();

    expect(usersApi.registerDevice).toHaveBeenCalledWith({
      token: 'ExponentPushToken[abc]',
      deviceId: 'dev-fixed-1',
    });
    const cached = SecureStore.__store.get('printslot-last-device-registration');
    expect(cached && JSON.parse(cached)).toEqual({
      token: 'ExponentPushToken[abc]',
      deviceId: 'dev-fixed-1',
    });
  });

  it('skips the API call on a cache hit (same token + deviceId)', async () => {
    SecureStore.__store.set(
      'printslot-last-device-registration',
      JSON.stringify({ token: 'ExponentPushToken[abc]', deviceId: 'dev-fixed-1' }),
    );
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });

    await registerDeviceOnce();

    expect(usersApi.registerDevice).not.toHaveBeenCalled();
  });

  it('re-registers when the cached token differs from the current token', async () => {
    SecureStore.__store.set(
      'printslot-last-device-registration',
      JSON.stringify({ token: 'ExponentPushToken[OLD]', deviceId: 'dev-fixed-1' }),
    );
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[NEW]' });
    usersApi.registerDevice.mockResolvedValueOnce({});

    await registerDeviceOnce();

    expect(usersApi.registerDevice).toHaveBeenCalledWith({
      token: 'ExponentPushToken[NEW]',
      deviceId: 'dev-fixed-1',
    });
  });

  it('requests permission when not yet granted, then proceeds', async () => {
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: true });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[xyz]' });
    usersApi.registerDevice.mockResolvedValueOnce({});

    await registerDeviceOnce();

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(usersApi.registerDevice).toHaveBeenCalled();
  });

  it('does not call the API when permission is denied (cannot ask again)', async () => {
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: false });

    await registerDeviceOnce();

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(usersApi.registerDevice).not.toHaveBeenCalled();
  });

  it('does not call the API when the user denies the permission prompt', async () => {
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });

    await registerDeviceOnce();

    expect(usersApi.registerDevice).not.toHaveBeenCalled();
  });
});
