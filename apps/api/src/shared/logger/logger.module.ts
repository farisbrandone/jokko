import type { IncomingMessage } from 'node:http';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { AppConfig } from '../../config/configuration';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const isDev = config.get('env', { infer: true }) !== 'production';
        return {
          pinoHttp: {
            level: config.get('logLevel', { infer: true }),
            transport: isDev
              ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } }
              : undefined,
            autoLogging: true,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            customProps: (req: IncomingMessage) => ({
              shopId: (req.headers['x-shop-id'] as string | undefined) ?? null,
            }),
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
