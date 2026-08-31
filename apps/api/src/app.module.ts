import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { buildConfig, type AppConfig } from './config/configuration';
import { validateEnv } from './config/env.schema';
import { buildMikroOrmConfig } from './config/mikro-orm.config';
import { LoggerModule } from './shared/logger/logger.module';
import { TenantModule } from './shared/tenant/tenant.module';
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
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        buildMikroOrmConfig({
          clientUrl: config.get('database', { infer: true }).url,
          debug: false,
        }),
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    TenantModule,
    HealthModule,
    CatalogModule,
  ],
})
export class AppModule {}
