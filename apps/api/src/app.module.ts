import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { buildConfig, type AppConfig } from './config/configuration';
import { validateEnv } from './config/env.schema';
import { buildMikroOrmConfig } from './config/mikro-orm.config';
import { LoggerModule } from './shared/logger/logger.module';
import { TenantModule } from './shared/tenant/tenant.module';
import { HealthModule } from './shared/health/health.module';
import { MetricsModule } from './shared/metrics/metrics.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ShopModule } from './modules/shop/shop.module';
import { TenantMiddleware } from './modules/shop/tenant/tenant.middleware';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SearchModule } from './modules/search/search.module';
import { MediaModule } from './modules/media/media.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PushModule } from './modules/push/push.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { BillingModule } from './modules/billing/billing.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { TeamModule } from './modules/team/team.module';
import { AdminModule } from './modules/admin/admin.module';

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
    EventEmitterModule.forRoot({ global: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const t = config.get('throttle', { infer: true });
        const trusted = new Set(t.trustedIps);
        // Un seul throttler global ; les routes sensibles resserrent via @Throttle.
        return {
          throttlers: [{ name: 'default', ttl: t.ttlSec * 1000, limit: t.limit }],
          skipIf: (ctx) => {
            if (process.env.THROTTLE_DISABLED === '1') return true;
            const req = ctx.switchToHttp().getRequest<{ ip?: string }>();
            return !!req.ip && trusted.has(req.ip);
          },
        };
      },
    }),
    LoggerModule,
    TenantModule,
    HealthModule,
    MetricsModule,
    IdentityModule,
    ShopModule,
    CatalogModule,
    SearchModule,
    MediaModule,
    MessagingModule,
    NotificationsModule,
    PushModule,
    AnalyticsModule,
    ModerationModule,
    BillingModule,
    OrdersModule,
    ReviewsModule,
    PrivacyModule,
    TeamModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Monté à la racine (motif purement joker) pour que `req.url` reste complet
    // et que la résolution par chemin `/shops/:id` fonctionne. La résolution est
    // sans effet sur les routes qui n'ont pas de boutille à résoudre.
    consumer.apply(TenantMiddleware).forRoutes('{*path}');
  }
}
