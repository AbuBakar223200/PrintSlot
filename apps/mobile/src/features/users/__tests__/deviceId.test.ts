import { randomUuid, getDeviceId } from '../services/deviceId';

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

const SecureStore = require('expo-secure-store') as {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
};

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  SecureStore.__store.clear();
  SecureStore.getItemAsync.mockClear();
  SecureStore.setItemAsync.mockClear();
});

describe('randomUuid', () => {
  it('returns a string matching the v4 UUID shape', () => {
    for (let i = 0; i < 50; i++) {
      expect(randomUuid()).toMatch(UUID_V4_REGEX);
    }
  });

  it('produces distinct values across consecutive calls', () => {
    const values = new Set<string>();
    for (let i = 0; i < 100; i++) values.add(randomUuid());
    expect(values.size).toBe(100);
  });
});

describe('getDeviceId', () => {
  it('generates and persists a UUID on first call', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(UUID_V4_REGEX);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('printslot-device-id', id);
    expect(SecureStore.__store.get('printslot-device-id')).toBe(id);
  });

  it('returns the same value on subsequent calls and does not regenerate', async () => {
    const first = await getDeviceId();
    SecureStore.setItemAsync.mockClear();
    const second = await getDeviceId();
    expect(second).toBe(first);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('reads from SecureStore when a value exists', async () => {
    SecureStore.__store.set('printslot-device-id', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
    const id = await getDeviceId();
    expect(id).toBe('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
