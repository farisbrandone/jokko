import { Entity, Filter, Index, PrimaryKey, Property } from '@mikro-orm/core';
import type { ConversationStatus, MessageSender } from '@jokko/contracts';

@Entity({ tableName: 'conversations' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
export class ConversationEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 80, fieldName: 'buyer_name' })
  buyerName!: string;

  @Property({ type: 'string', length: 20, fieldName: 'buyer_phone' })
  buyerPhone!: string;

  @Property({ type: 'string', length: 320, fieldName: 'buyer_email', nullable: true })
  buyerEmail: string | null = null;

  @Property({ type: 'uuid', fieldName: 'product_id', nullable: true })
  productId: string | null = null;

  @Property({ type: 'string', length: 160, fieldName: 'product_name', nullable: true })
  productName: string | null = null;

  @Property({ type: 'string', length: 10 })
  status: ConversationStatus = 'open';

  @Property({ type: 'string', length: 64, fieldName: 'buyer_token_hash' })
  buyerTokenHash!: string;

  @Property({ type: 'datetime', fieldName: 'last_message_at' })
  lastMessageAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

@Entity({ tableName: 'messages' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
export class MessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'conversation_id' })
  conversationId!: string;

  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 10 })
  sender!: MessageSender;

  @Property({ type: 'text' })
  body!: string;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}
