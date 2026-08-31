import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
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
import { IdentityModule } from './modules/identity/identity.module';
import { ShopModule } from './modules/shop/shop.module';
import { TenantMiddleware } from './modules/shop/tenant/tenant.middleware';
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
    IdentityModule,
    ShopModule,
    CatalogModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Monté à la racine (motif purement joker) pour que `req.url` reste complet
    // et que la résolution par chemin `/shops/:id` fonctionne. La résolution est
    // sans effet sur les routes qui n'ont pas de boutille à résoudre.
    consumer.apply(TenantMiddleware).forRoutes('{*path}');
  }
}
