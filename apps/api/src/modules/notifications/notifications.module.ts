import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { NewMessageListener } from './application/new-message.listener';
import { NotificationSettingsService } from './application/notification-settings.service';
import {
  DISPATCH_LOG_REPOSITORY,
  NOTIFICATION_SETTINGS_REPOSITORY,
  SMS_SENDER,
  WHATSAPP_SENDER,
} from './domain/ports';
import { LogSmsSender, LogWhatsAppSender } from './infrastructure/log.senders';
import { Mailer } from './infrastructure/mailer';
import { MikroOrmDispatchLogRepository } from './infrastructure/persistence/mikro-orm-dispatch-log.repository';
import { MikroOrmNotificationSettingsRepository } from './infrastructure/persistence/mikro-orm-notification-settings.repository';
import { TermiiSmsSender, TermiiWhatsAppSender } from './infrastructure/termii.senders';
import { NotificationSettingsController } from './presentation/notification-settings.controller';

/** Termii si une clé API est configurée, sinon adaptateur « log » (dev / CI). */
const smsProvider: Provider = {
  provide: SMS_SENDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const t = config.get('notifications', { infer: true }).termii;
    return t ? new TermiiSmsSender(t) : new LogSmsSender();
  },
};

const whatsappProvider: Provider = {
  provide: WHATSAPP_SENDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const t = config.get('notifications', { infer: true }).termii;
    return t ? new TermiiWhatsAppSender(t) : new LogWhatsAppSender();
  },
};

@Module({
  imports: [IdentityModule, ShopModule],
  controllers: [NotificationSettingsController],
  providers: [
    Mailer,
    NewMessageListener,
    NotificationSettingsService,
    smsProvider,
    whatsappProvider,
    { provide: NOTIFICATION_SETTINGS_REPOSITORY, useClass: MikroOrmNotificationSettingsRepository },
    { provide: DISPATCH_LOG_REPOSITORY, useClass: MikroOrmDispatchLogRepository },
  ],
  exports: [Mailer],
})
export class NotificationsModule {}
