import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ShopRole } from '@jokko/contracts';

@Entity({ tableName: 'users' })
export class UserEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Unique()
  @Property({ type: 'string', length: 320 })
  email!: string;

  @Property({ type: 'string', length: 80 })
  name!: string;

  @Property({ type: 'string', length: 255, fieldName: 'password_hash' })
  passwordHash!: string;

  @Property({ type: 'boolean', fieldName: 'is_platform_admin' })
  isPlatformAdmin = false;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'shop_memberships' })
@Unique({ properties: ['userId', 'shopId'] })
export class ShopMembershipEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 20 })
  role: ShopRole = 'viewer';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

@Entity({ tableName: 'auth_sessions' })
export class AuthSessionEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @Unique()
  @Property({ type: 'string', length: 255, fieldName: 'refresh_token_hash' })
  refreshTokenHash!: string;

  @Property({ type: 'string', length: 400, fieldName: 'user_agent', nullable: true })
  userAgent: string | null = null;

  @Property({ type: 'datetime', fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'revoked_at', nullable: true })
  revokedAt: Date | null = null;
}
