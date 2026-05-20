import {
  BadRequestException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile as NestUploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role, UploadedFile } from '@printslot/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'image/jpeg',
  'image/png',
];

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.CUSTOMER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB max
      },
    }),
  )
  async upload(
    @NestUploadedFile() file?: Express.Multer.File,
  ): Promise<UploadedFile> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required.');
    }

    if (!file.originalname) {
      throw new BadRequestException('File name is required.');
    }

    if (file.size === 0) {
      throw new BadRequestException('Empty file.');
    }

    if (!ACCEPTED_MIME.includes(file.mimetype)) {
      throw new HttpException(
        'Unsupported file type',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    return this.uploadService.uploadFile(file);
  }
}
