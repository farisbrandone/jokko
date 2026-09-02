import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ShopRole } from '@jokko/contracts';

@Entity({ tableName: 'shop_invitations' })
export class ShopInvitationEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 320 })
  email!: string;

  @Property({ type: 'string', length: 20 })
  role!: ShopRole;

  @Unique()
  @Property({ type: 'string', length: 64, fieldName: 'token_hash' })
  tokenHash!: string;

  @Property({ type: 'uuid', fieldName: 'invited_by', nullable: true })
  invitedBy: string | null = null;

  @Property({ type: 'datetime', fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'datetime', fieldName: 'accepted_at', nullable: true })
  acceptedAt: Date | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}
