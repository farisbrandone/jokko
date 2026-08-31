import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { MessagingService } from './application/messaging.service';
import { CONVERSATION_REPOSITORY } from './domain/ports/conversation.repository';
import { MikroOrmConversationRepository } from './infrastructure/persistence/mikro-orm-conversation.repository';
import { PublicConversationController } from './presentation/public-conversation.controller';
import { InboxController } from './presentation/inbox.controller';

@Module({
  imports: [IdentityModule, ShopModule],
  controllers: [PublicConversationController, InboxController],
  providers: [
    MessagingService,
    { provide: CONVERSATION_REPOSITORY, useClass: MikroOrmConversationRepository },
  ],
})
export class MessagingModule {}
