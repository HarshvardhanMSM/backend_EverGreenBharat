import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER_TOKEN } from './storage-provider.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  controllers: [UploadsController],
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
      useFactory: (
        config: ConfigService,
        localProvider: LocalStorageProvider,
        s3Provider: S3StorageProvider,
      ) => {
        const s3AccessKey = config.get<string>('S3_ACCESS_KEY');
        if (s3AccessKey && s3AccessKey.trim().length > 0) {
          return s3Provider;
        }
        return localProvider;
      },
    },
  ],
  exports: [STORAGE_PROVIDER_TOKEN, LocalStorageProvider, S3StorageProvider],
})
export class StorageModule {}
