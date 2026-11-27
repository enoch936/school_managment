import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageService, UploadOptions, UploadResult } from './storage.interface';
import { DomainException } from '../../common/exceptions/domain.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly baseDir = path.resolve(process.cwd(), 'uploads');

  constructor() {
    void fs.mkdir(this.baseDir, { recursive: true }).catch((err) => {
      this.logger.error(`Failed to initialize upload directory: ${err.message}`);
    });
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (options?.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
      throw new DomainException(
        'INVALID_MIME_TYPE',
        `Mime type ${mimeType} is not permitted`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (options?.maxSizeBytes && buffer.length > options.maxSizeBytes) {
      throw new DomainException(
        'FILE_TOO_LARGE',
        `File exceeds maximum limit of ${options.maxSizeBytes} bytes`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const folder = options?.folder ?? 'general';
    const folderPath = path.join(this.baseDir, folder);
    await fs.mkdir(folderPath, { recursive: true });

    const ext = path.extname(filename);
    const uniqueKey = `${folder}/${crypto.randomUUID()}${ext}`;
    const destinationPath = path.join(this.baseDir, uniqueKey);

    await fs.writeFile(destinationPath, buffer);

    return {
      key: uniqueKey,
      url: `/uploads/${uniqueKey}`,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    // Generate HMAC-signed token expiring in expiresInSeconds
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const secret = process.env.JWT_ACCESS_SECRET || 'storage_signing_key';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${key}:${expiresAt}`)
      .digest('hex');

    return `/api/v1/storage/download?key=${encodeURIComponent(key)}&exp=${expiresAt}&sig=${signature}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to delete storage file at ${key}: ${(err as Error).message}`);
      }
    }
  }
}
