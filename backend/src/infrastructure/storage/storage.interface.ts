export interface UploadOptions {
  folder?: string;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
  isSensitive?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageService {
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  delete(key: string): Promise<void>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
