import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from '../upload.service';
import { CLOUDINARY_PROVIDER } from '../../../config/cloudinary.config';
import pdf from 'pdf-parse';

jest.mock('pdf-parse', () => jest.fn());

describe('UploadService', () => {
  let service: UploadService;
  let mockCloudinary: any;
  let mockUploadStream: jest.Mock;

  beforeEach(async () => {
    mockUploadStream = jest.fn();
    mockCloudinary = {
      uploader: {
        upload_stream: mockUploadStream,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: CLOUDINARY_PROVIDER,
          useValue: mockCloudinary,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);

    jest.clearAllMocks();
  });

  it('1. PDF upload returns correct detectedPages from pdf-parse mock', async () => {
    (pdf as unknown as jest.Mock).mockResolvedValueOnce({ numpages: 12 });

    mockUploadStream.mockImplementationOnce((options, callback) => {
      callback(null, { secure_url: 'https://cloudinary.com/pending/test.pdf' });
      return { end: jest.fn() };
    });

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('mock-pdf'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.uploadFile(file);

    expect(result.fileUrl).toBe('https://cloudinary.com/pending/test.pdf');
    expect(result.fileName).toBe('test.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileSize).toBe(100);
    expect(result.detectedPages).toBe(12);

    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'printslot/pending/',
        resource_type: 'raw',
      }),
      expect.any(Function),
    );
  });

  it('2. PNG upload returns detectedPages: null', async () => {
    mockUploadStream.mockImplementationOnce((options, callback) => {
      callback(null, { secure_url: 'https://cloudinary.com/pending/test.png' });
      return { end: jest.fn() };
    });

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 500,
      buffer: Buffer.from('mock-png'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.uploadFile(file);

    expect(result.fileUrl).toBe('https://cloudinary.com/pending/test.png');
    expect(result.detectedPages).toBeNull();
    expect(pdf).not.toHaveBeenCalled();

    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'printslot/pending/image/',
        resource_type: 'image',
      }),
      expect.any(Function),
    );
  });

  it('3. pdf-parse error returns detectedPages: null (does not throw)', async () => {
    (pdf as unknown as jest.Mock).mockRejectedValueOnce(new Error('Corrupt PDF'));

    mockUploadStream.mockImplementationOnce((options, callback) => {
      callback(null, { secure_url: 'https://cloudinary.com/pending/corrupt.pdf' });
      return { end: jest.fn() };
    });

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'corrupt.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 200,
      buffer: Buffer.from('corrupt-pdf'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.uploadFile(file);

    expect(result.fileUrl).toBe('https://cloudinary.com/pending/corrupt.pdf');
    expect(result.detectedPages).toBeNull();
  });

  it('4. Cloudinary upload uses printslot/pending/ folder', async () => {
    mockUploadStream.mockImplementationOnce((options, callback) => {
      callback(null, { secure_url: 'https://cloudinary.com/pending/test.docx' });
      return { end: jest.fn() };
    });

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'doc.docx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 300,
      buffer: Buffer.from('mock-docx'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    await service.uploadFile(file);

    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'printslot/pending/docs/',
      }),
      expect.any(Function),
    );
  });

  it('5. Cloudinary upload uses resource_type: image for image MIMEs', async () => {
    mockUploadStream.mockImplementationOnce((options, callback) => {
      callback(null, { secure_url: 'https://cloudinary.com/pending/test.jpg' });
      return { end: jest.fn() };
    });

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 400,
      buffer: Buffer.from('mock-jpg'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    await service.uploadFile(file);

    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'image',
      }),
      expect.any(Function),
    );
  });
});
