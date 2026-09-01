import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { IdentityModule } from '../identity/identity.module';
import { PushService } from './application/push.service';
import { PUSH_SENDER, PUSH_SUBSCRIPTION_REPOSITORY } from './domain/ports';
import { MikroOrmPushSubscriptionRepository } from './infrastructure/persistence/mikro-orm-push-subscription.repository';
import { LogPushSender, WebPushSender } from './infrastructure/web-push.sender';
import { PushController } from './presentation/push.controller';

/** WebPushSender si clés VAPID configurées, sinon adaptateur « log ». */
const pushSenderProvider: Provider = {
  provide: PUSH_SENDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const vapid = config.get('notifications', { infer: true }).webPush;
    return vapid ? new WebPushSender(vapid) : new LogPushSender();
  },
};

@Module({
  imports: [IdentityModule],
  controllers: [PushController],
  providers: [
    PushService,
    pushSenderProvider,
    { provide: PUSH_SUBSCRIPTION_REPOSITORY, useClass: MikroOrmPushSubscriptionRepository },
  ],
  exports: [PUSH_SENDER, PUSH_SUBSCRIPTION_REPOSITORY],
})
export class PushModule {}
