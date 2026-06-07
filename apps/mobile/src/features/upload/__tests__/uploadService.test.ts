import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { uploadFile } from '../services/uploadService';

jest.mock('@/config/env', () => ({
  __esModule: true,
  default: { API_URL: 'https://api.test' },
}));

jest.mock('@/features/auth/session/authSession', () => ({
  authSession: { getAccessToken: () => 'test-token' },
}));

type MockFetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type MockFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<MockFetchResponse>;

const fetchMock = jest.fn<MockFetch>();
globalThis.fetch = fetchMock as unknown as typeof fetch;

type FormDataPart = {
  fieldName: string;
  value: { uri: string; name: string; type: string };
};

const formDataInstances: MockFormData[] = [];

class MockFormData {
  parts: FormDataPart[] = [];

  append(fieldName: string, value: FormDataPart['value']) {
    this.parts.push({ fieldName, value });
  }
}

(globalThis as unknown as { FormData: typeof MockFormData }).FormData = class extends MockFormData {
  constructor() {
    super();
    formDataInstances.push(this);
  }
};

function mockOk<T>(data: T) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data, message: 'ok', statusCode: 201 }),
  });
}

function mockError(statusCode: number, message: string) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ data: null, message, statusCode }),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  formDataInstances.length = 0;
});

describe('uploadService.uploadFile', () => {
  it('sends multipart POST /upload with the file field', async () => {
    mockOk({
      fileUrl: 'https://cdn.test/file.pdf',
      fileName: 'syllabus.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      detectedPages: 8,
    });

    await uploadFile('file:///tmp/syllabus.pdf', 'syllabus.pdf', 'application/pdf');

    const [url, init] = fetchMock.mock.calls[0];
    const requestInit = init as RequestInit;

    expect(url).toBe('https://api.test/upload');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual({ Authorization: 'Bearer test-token' });
    expect(requestInit.body).toBe(formDataInstances[0]);
    expect(formDataInstances[0].parts).toEqual([
      {
        fieldName: 'file',
        value: {
          uri: 'file:///tmp/syllabus.pdf',
          name: 'syllabus.pdf',
          type: 'application/pdf',
        },
      },
    ]);
  });

  it('returns the parsed UploadedFile response', async () => {
    const uploadedFile = {
      fileUrl: 'https://cdn.test/file.pdf',
      fileName: 'syllabus.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      detectedPages: 8,
    };
    mockOk(uploadedFile);

    const result = await uploadFile('file:///tmp/syllabus.pdf', 'syllabus.pdf', 'application/pdf');

    expect(result).toEqual(uploadedFile);
  });

  it.each([
    [415, 'Unsupported file type'],
    [413, 'File too large'],
  ])('propagates server error %s', async (statusCode, message) => {
    mockError(statusCode, message);

    await expect(
      uploadFile('file:///tmp/file.exe', 'file.exe', 'application/x-msdownload'),
    ).rejects.toMatchObject({ message, statusCode });
  });
});
