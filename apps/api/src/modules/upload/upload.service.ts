import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CLOUDINARY_PROVIDER } from '../../config/cloudinary.config';
import { UploadApiResponse } from 'cloudinary';
import pdf from 'pdf-parse';
import { UploadedFile } from '@printslot/shared';

@Injectable()
export class UploadService {
  constructor(
    @Inject(CLOUDINARY_PROVIDER)
    private readonly cloudinary: any,
  ) {}

  /**
   * Uploads a file to Cloudinary in printslot/pending/ folder.
   * If the file is a PDF, it detects the number of pages.
   */
  async uploadFile(file: Express.Multer.File): Promise<UploadedFile> {
    const resourceType = this.getResourceType(file.mimetype);
    const folder = this.getFolder(file.originalname, file.mimetype);
    const publicId = this.getUniquePublicId(file.originalname);

    // Upload to Cloudinary using upload_stream
    const uploadResult = await this.uploadToCloudinary(file.buffer, resourceType, folder, publicId);

    // Detect pages if the file is a PDF
    let detectedPages: number | null = null;
    if (file.mimetype === 'application/pdf') {
      try {
        const parsed = await pdf(file.buffer);
        detectedPages = parsed.numpages ?? null;
      } catch (error) {
        console.error('Error parsing PDF page count:', error);
        detectedPages = null;
      }
    }

    return {
      fileUrl: uploadResult.secure_url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      detectedPages,
    };
  }

  /**
   * Wrap Cloudinary's upload_stream in a Promise.
   */
  private uploadToCloudinary(
    buffer: Buffer,
    resourceType: 'image' | 'raw',
    folder: string,
    publicId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: publicId,
        },
        (error: any, result: UploadApiResponse) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new InternalServerErrorException('Failed to upload file to Cloudinary'));
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Determine Cloudinary resource_type based on MIME type.
   */
  private getResourceType(mimeType: string): 'image' | 'raw' {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    return 'raw';
  }

  /**
   * Determine dynamic Cloudinary folder based on file extension and MIME type.
   */
  private getFolder(fileName: string, mimeType: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'printslot/pending/pdf/';
    }
    if (mimeType.startsWith('image/')) {
      return 'printslot/pending/image/';
    }
    return 'printslot/pending/docs/';
  }

  /**
   * Generates a unique name retaining the original file extension so Cloudinary URLs are viewable/renderable inline.
   */
  private getUniquePublicId(fileName: string): string {
    const parts = fileName.split('.');
    const extension = parts.pop()?.toLowerCase() || '';
    const nameWithoutExt = parts.join('.')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');

    const uniqueSuffix = Math.random().toString(36).substring(2, 8) + '-' + Date.now();
    return nameWithoutExt ? `${nameWithoutExt}-${uniqueSuffix}.${extension}` : `${uniqueSuffix}.${extension}`;
  }
}
