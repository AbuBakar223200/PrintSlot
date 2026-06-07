import { usersApi } from '../services/usersApi';

jest.mock('@/config/env', () => ({
  __esModule: true,
  default: { API_URL: 'https://api.test' },
}));

jest.mock('@/features/auth/session/authSession', () => ({
  authSession: { getAccessToken: () => 'test-token' },
}));

const fetchMock = jest.fn();
(global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

function mockOk<T>(data: T) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data, message: 'ok', statusCode: 200 }),
  });
}

function mockError(statusCode: number, message: string) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ data: null, message, statusCode }),
  });
}

beforeEach(() => fetchMock.mockReset());

describe('usersApi.updateProfile', () => {
  it('PATCHes /users/me with the input body', async () => {
    mockOk({ id: 'u1', name: 'Jane', phone: null });
    await usersApi.updateProfile({ name: 'Jane' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/users/me');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'Jane' });
  });

  it('returns the unwrapped user from the response envelope', async () => {
    mockOk({ id: 'u1', name: 'Jane' });
    const result = await usersApi.updateProfile({ name: 'Jane' });
    expect(result).toMatchObject({ id: 'u1', name: 'Jane' });
  });

  it('throws on non-2xx with the server message', async () => {
    mockError(400, 'Name is required');
    await expect(usersApi.updateProfile({ name: '' as never })).rejects.toThrow('Name is required');
  });
});

describe('usersApi.registerDevice', () => {
  it('PATCHes /users/me/device with token and deviceId', async () => {
    mockOk({ id: 'd1', deviceId: 'dev-1', token: 'tok-1' });
    await usersApi.registerDevice({ token: 'tok-1', deviceId: 'dev-1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/users/me/device');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ token: 'tok-1', deviceId: 'dev-1' });
  });
});

describe('usersApi.unregisterDevice', () => {
  it('DELETEs /users/me/device/:deviceId with the id encoded in the path', async () => {
    mockOk({ success: true });
    await usersApi.unregisterDevice('dev with space');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/users/me/device/dev%20with%20space');
    expect(init.method).toBe('DELETE');
  });

  it('surfaces server errors so the caller can swallow them best-effort', async () => {
    mockError(404, 'Device not found');
    await expect(usersApi.unregisterDevice('dev-1')).rejects.toThrow('Device not found');
  });
});
