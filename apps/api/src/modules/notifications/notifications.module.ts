import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { Mailer } from './infrastructure/mailer';
import { NewMessageListener } from './application/new-message.listener';

@Module({
  imports: [IdentityModule, ShopModule],
  providers: [Mailer, NewMessageListener],
  exports: [Mailer],
})
export class NotificationsModule {}
