import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
  BadRequestException,
  Res,
  Inject,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { ALLOWED_FOLDERS } from './local-storage.provider';
import { Public } from '../decorators/public.decorator';
import { OptionalAuth } from '../decorators/optional-auth.decorator';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from './storage-provider.interface';

const ALLOWED_FILENAME = /^[a-zA-Z0-9_.-]{1,100}\.(jpg|jpeg|png|webp)$/i;

@ApiTags('Uploads')
@Controller('v1/uploads')
export class UploadsController {
  constructor(
    private readonly configService: ConfigService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: StorageProvider,
  ) {}

  @Public()
  @Get(':folder/:filename')
  @ApiOperation({ summary: 'Serve an uploaded media file' })
  serve(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException('Invalid storage folder');
    }
    if (!ALLOWED_FILENAME.test(filename)) {
      throw new BadRequestException('Invalid filename');
    }

    const uploadsDir =
      this.configService.get<string>('uploads.dir') || 'uploads';
    const filePath = path.resolve(uploadsDir, folder, filename);
    const rootPath = path.resolve(uploadsDir);
    if (!filePath.startsWith(rootPath + path.sep)) {
      throw new BadRequestException('Invalid file path');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Set high-performance caching headers for browser and CDN (7 days cache)
    res.setHeader(
      'Cache-Control',
      'public, max-age=604800, stale-while-revalidate=86400',
    );
    return res.sendFile(filePath);
  }

  @OptionalAuth()
  @Post(':folder')
  @ApiOperation({ summary: 'Upload single media file (images: jpeg/png/webp)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @Param('folder') folder: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException(`Invalid storage folder '${folder}'`);
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const url = await this.storageProvider.save(
      folder,
      file.buffer,
      file.mimetype,
    );

    return {
      url,
      filename: path.basename(url),
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @OptionalAuth()
  @Post(':folder/multiple')
  @ApiOperation({ summary: 'Upload multiple media files (max 10 images)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadMultiple(
    @Param('folder') folder: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException(`Invalid storage folder '${folder}'`);
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const results = await Promise.all(
      files.map(async (f) => {
        const url = await this.storageProvider.save(
          folder,
          f.buffer,
          f.mimetype,
        );
        return {
          url,
          filename: path.basename(url),
          size: f.size,
          mimeType: f.mimetype,
        };
      }),
    );

    return {
      urls: results.map((r) => r.url),
      files: results,
    };
  }
}
