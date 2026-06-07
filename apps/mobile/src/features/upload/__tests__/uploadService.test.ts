import { uploadFile } from '../services/uploadService';

jest.mock('@/config/env', () => ({
  __esModule: true,
  default: { API_URL: 'https://api.test' },
}));

jest.mock('@/features/auth/session/authSession', () => ({
  authSession: { getAccessToken: () => 'test-token' },
}));

const fetchMock = jest.fn();
(global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

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

(global as unknown as { FormData: typeof MockFormData }).FormData = class extends MockFormData {
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
    expect(url).toBe('https://api.test/upload');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer test-token' });
    expect(init.body).toBe(formDataInstances[0]);
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
