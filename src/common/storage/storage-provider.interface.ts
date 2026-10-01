export const STORAGE_PROVIDER_TOKEN = 'STORAGE_PROVIDER';

export interface StorageProvider {
  save(folder: string, buffer: Buffer, mimeType: string): Promise<string>;
}
