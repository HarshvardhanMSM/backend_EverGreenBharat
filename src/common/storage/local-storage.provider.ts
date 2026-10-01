import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageProvider } from './storage-provider.interface';

export const ALLOWED_FOLDERS = [
  'avatars',
  'covers',
  'products',
  'banners',
  'influencer-content',
  'stores',
  'documents',
];

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get uploadsDir(): string {
    return this.configService.get<string>('uploads.dir') || 'uploads';
  }

  async save(
    folder: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException(
        `Storage folder '${folder}' is not allowed`,
      );
    }

    const extension = MIME_EXTENSIONS[mimeType];
    if (!extension) {
      throw new BadRequestException('Unsupported image type');
    }

    const folderPath = path.resolve(this.uploadsDir, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const filePath = path.join(folderPath, filename);
    await fs.promises.writeFile(filePath, buffer);

    this.logger.log(`Stored ${mimeType} file at ${filePath}`);
    return `/api/v1/uploads/${folder}/${filename}`;
  }
}
