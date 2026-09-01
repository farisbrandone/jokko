import { Entity, Filter, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

@Entity({ tableName: 'notification_settings' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
export class NotificationSettingsEntity {
  @PrimaryKey({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'boolean', fieldName: 'email_enabled' })
  emailEnabled = true;

  @Property({ type: 'boolean', fieldName: 'whatsapp_enabled' })
  whatsappEnabled = false;

  @Property({ type: 'boolean', fieldName: 'sms_enabled' })
  smsEnabled = false;

  @Property({ type: 'boolean', fieldName: 'push_enabled' })
  pushEnabled = true;

  @Property({ type: 'integer', fieldName: 'cooldown_seconds' })
  cooldownSeconds = 300;

  @Property({ type: 'datetime', fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'notification_dispatch_log' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
export class NotificationDispatchLogEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'uuid', fieldName: 'conversation_id' })
  conversationId!: string;

  @Property({ type: 'string', length: 10 })
  channel!: 'email' | 'whatsapp' | 'sms' | 'push';

  @Property({ type: 'datetime', fieldName: 'sent_at' })
  sentAt: Date = new Date();
}
