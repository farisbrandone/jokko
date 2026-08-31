import { BaseDomainEvent } from '@jokko/domain-kernel';
import type { MessageSender } from '@jokko/contracts';

export class ConversationStarted extends BaseDomainEvent {
  readonly name = 'messaging.conversation.started';
  constructor(shopId: string, conversationId: string, buyerName: string) {
    super(conversationId, shopId, { conversationId, buyerName }, [`shop:${shopId}:inbox`]);
  }
}

export class MessageSent extends BaseDomainEvent {
  readonly name = 'messaging.message.sent';
  constructor(shopId: string, conversationId: string, sender: MessageSender) {
    super(conversationId, shopId, { conversationId, sender }, [
      `shop:${shopId}:inbox`,
      `conversation:${conversationId}`,
    ]);
  }
}
