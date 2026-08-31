import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import type { AppConfig } from '../../../config/configuration';

export const S3 = Symbol('S3');

export const s3Provider: Provider = {
  provide: S3,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const media = config.get('media', { infer: true });
    return new S3Client({
      endpoint: media.s3Endpoint,
      region: media.region,
      forcePathStyle: true,
      credentials: { accessKeyId: media.accessKey, secretAccessKey: media.secretKey },
    });
  },
};
