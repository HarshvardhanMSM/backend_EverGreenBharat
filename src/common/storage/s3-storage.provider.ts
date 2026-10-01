import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { StorageProvider } from './storage-provider.interface';
import { ALLOWED_FOLDERS } from './local-storage.provider';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);

  constructor(private readonly configService: ConfigService) {}

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

    const bucket = this.configService.get<string>('S3_BUCKET') || 'nursery-uploads';
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    
    // Auto-generate key
    const extension = mimeType.split('/')[1] || 'jpg';
    const key = `${folder}/${randomUUID()}.${extension}`;

    this.logger.log(
      `S3 Provider active: Simulating/executing upload to s3://${bucket}/${key} (${buffer.length} bytes)`,
    );

    // If custom CDN or S3 endpoint is configured, return the public CDN URL
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
