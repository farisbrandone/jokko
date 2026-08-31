import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { buildConfig } from './config/configuration';
import { validateEnv } from './config/env.schema';
import { LoggerModule } from './shared/logger/logger.module';
import { HealthModule } from './shared/health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
      validate: (raw) => buildConfig(validateEnv(raw)),
    }),
    LoggerModule,
    HealthModule,
    CatalogModule,
  ],
})
export class AppModule {}
