import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { UploadUrlRequest, UploadUrlResponse } from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import { S3 } from '../infrastructure/s3.provider';

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const UPLOAD_TTL = 300;

export interface ImgproxyOptions {
  width?: number;
  height?: number;
  resize?: 'fit' | 'fill' | 'auto';
}

@Injectable()
export class MediaService {
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly imgproxyBase: string;

  constructor(
    @Inject(S3) private readonly s3: S3Client,
    config: ConfigService<AppConfig, true>,
  ) {
    const media = config.get('media', { infer: true });
    this.bucket = media.bucket;
    this.publicBaseUrl = media.publicBaseUrl;
    this.imgproxyBase = media.imgproxyUrl;
  }

  async createUploadUrl(shopId: string, req: UploadUrlRequest): Promise<UploadUrlResponse> {
    const key = `shops/${shopId}/${randomUUID()}${EXT[req.contentType] ?? ''}`;
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: req.contentType }),
      { expiresIn: UPLOAD_TTL },
    );
    return {
      key,
      uploadUrl,
      uploadMethod: 'PUT',
      publicUrl: `${this.publicBaseUrl}/${key}`,
      expiresInSeconds: UPLOAD_TTL,
    };
  }

  /** URL de transformation à la volée (mode dev « insecure »). */
  imgproxyUrl(key: string, opts: ImgproxyOptions = {}): string {
    const { width = 800, height = 800, resize = 'fit' } = opts;
    return `${this.imgproxyBase}/insecure/rs:${resize}:${width}:${height}/plain/s3://${this.bucket}/${key}`;
  }
}
