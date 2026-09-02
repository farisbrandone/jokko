import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ShopRole } from '@jokko/contracts';

@Entity({ tableName: 'users' })
export class UserEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Unique()
  @Property({ type: 'string', length: 320 })
  email!: string;

  // Index unique partiel géré en migration (users_phone_uniq).
  @Property({ type: 'string', length: 20, nullable: true })
  phone: string | null = null;

  @Property({ type: 'string', length: 80 })
  name!: string;

  @Property({ type: 'string', length: 255, fieldName: 'password_hash', nullable: true })
  passwordHash: string | null = null;

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

@Entity({ tableName: 'oauth_identities' })
@Unique({ properties: ['provider', 'providerAccountId'] })
export class OAuthIdentityEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @Property({ type: 'string', length: 20 })
  provider!: string;

  @Property({ type: 'string', length: 255, fieldName: 'provider_account_id' })
  providerAccountId!: string;

  @Property({ type: 'string', length: 320, nullable: true })
  email: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

@Entity({ tableName: 'webauthn_credentials' })
export class WebAuthnCredentialEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @Unique()
  @Property({ type: 'text', fieldName: 'credential_id' })
  credentialId!: string;

  @Property({ type: 'text', fieldName: 'public_key' })
  publicKey!: string;

  // Compteur anti-rejeu : stocké en bigint, manipulé comme chaîne par MikroORM.
  @Property({ type: 'bigint' })
  counter = '0';

  @Property({ type: 'json' })
  transports: string[] = [];

  @Property({ type: 'string', length: 120, fieldName: 'device_name', nullable: true })
  deviceName: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'last_used_at', nullable: true })
  lastUsedAt: Date | null = null;
}

@Entity({ tableName: 'otp_challenges' })
export class OtpChallengeEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Index()
  @Property({ type: 'string', length: 20 })
  phone!: string;

  @Property({ type: 'string', length: 64, fieldName: 'code_hash' })
  codeHash!: string;

  @Property({ type: 'datetime', fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'integer' })
  attempts = 0;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}
