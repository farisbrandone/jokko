import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ShopRole } from '@jokko/contracts';
import { User } from '../../domain/user.aggregate';
import type {
  MembershipRecord,
  MembershipRepository,
  OAuthIdentityRecord,
  OAuthIdentityRepository,
  OtpChallenge,
  OtpChallengeRepository,
  SessionRecord,
  SessionRepository,
  ShopMemberContact,
  UserRepository,
  WebAuthnCredentialRecord,
  WebAuthnCredentialRepository,
} from '../../domain/ports';
import { ShopEntity } from '../../../shop/infrastructure/persistence/shop.entity';
import {
  AuthSessionEntity,
  OAuthIdentityEntity,
  OtpChallengeEntity,
  ShopMembershipEntity,
  UserEntity,
  WebAuthnCredentialEntity,
} from './identity.entity';

@Injectable()
export class MikroOrmUserRepository implements UserRepository {
  constructor(private readonly em: EntityManager) {}

  async save(user: User): Promise<void> {
    const em = this.em.fork();
    const s = user.toSnapshot();
    const entity = (await em.findOne(UserEntity, { id: s.id })) ?? new UserEntity();
    entity.id = s.id;
    entity.email = s.email;
    entity.phone = s.phone;
    entity.name = s.name;
    entity.passwordHash = s.passwordHash;
    entity.createdAt = new Date(s.createdAt);
    em.persist(entity);
    user.pullDomainEvents();
    await em.flush();
  }

  async findById(id: string): Promise<User | null> {
    const e = await this.em.fork().findOne(UserEntity, { id });
    return e ? this.toDomain(e) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const e = await this.em.fork().findOne(UserEntity, { email: email.toLowerCase() });
    return e ? this.toDomain(e) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const e = await this.em.fork().findOne(UserEntity, { phone: phone.trim() });
    return e ? this.toDomain(e) : null;
  }

  private toDomain(e: UserEntity): User {
    return User.restore({
      id: e.id,
      email: e.email,
      phone: e.phone,
      name: e.name,
      passwordHash: e.passwordHash,
      isPlatformAdmin: e.isPlatformAdmin,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    });
  }
}

@Injectable()
export class MikroOrmOtpChallengeRepository implements OtpChallengeRepository {
  constructor(private readonly em: EntityManager) {}

  async create(phone: string, codeHash: string, expiresAt: Date): Promise<void> {
    const em = this.em.fork();
    const row = new OtpChallengeEntity();
    row.id = randomUUID();
    row.phone = phone.trim();
    row.codeHash = codeHash;
    row.expiresAt = expiresAt;
    em.persist(row);
    await em.flush();
  }

  async latest(phone: string): Promise<OtpChallenge | null> {
    const e = await this.em
      .fork()
      .findOne(OtpChallengeEntity, { phone: phone.trim() }, { orderBy: { createdAt: 'desc' } });
    return e
      ? { id: e.id, codeHash: e.codeHash, expiresAt: e.expiresAt, attempts: e.attempts }
      : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    const em = this.em.fork();
    const e = await em.findOne(OtpChallengeEntity, { id });
    if (e) {
      e.attempts += 1;
      await em.flush();
    }
  }

  async consume(id: string): Promise<void> {
    await this.em.fork().nativeDelete(OtpChallengeEntity, { id });
  }

  async countSince(phone: string, sinceMs: number): Promise<number> {
    return this.em.fork().count(OtpChallengeEntity, {
      phone: phone.trim(),
      createdAt: { $gte: new Date(Date.now() - sinceMs) },
    });
  }
}

@Injectable()
export class MikroOrmOAuthIdentityRepository implements OAuthIdentityRepository {
  constructor(private readonly em: EntityManager) {}

  async find(provider: string, providerAccountId: string): Promise<OAuthIdentityRecord | null> {
    const e = await this.em.fork().findOne(OAuthIdentityEntity, { provider, providerAccountId });
    return e
      ? { userId: e.userId, provider: e.provider, providerAccountId: e.providerAccountId }
      : null;
  }

  async link(
    userId: string,
    provider: string,
    providerAccountId: string,
    email: string | null,
  ): Promise<void> {
    const em = this.em.fork();
    const existing = await em.findOne(OAuthIdentityEntity, { provider, providerAccountId });
    const entity = existing ?? new OAuthIdentityEntity();
    entity.id = existing?.id ?? randomUUID();
    entity.userId = userId;
    entity.provider = provider;
    entity.providerAccountId = providerAccountId;
    entity.email = email;
    em.persist(entity);
    await em.flush();
  }
}

@Injectable()
export class MikroOrmWebAuthnCredentialRepository implements WebAuthnCredentialRepository {
  constructor(private readonly em: EntityManager) {}

  private toRecord(e: WebAuthnCredentialEntity): WebAuthnCredentialRecord {
    return {
      id: e.id,
      userId: e.userId,
      credentialId: e.credentialId,
      publicKey: e.publicKey,
      counter: Number(e.counter),
      transports: e.transports ?? [],
      deviceName: e.deviceName,
      createdAt: e.createdAt,
      lastUsedAt: e.lastUsedAt,
    };
  }

  async create(input: {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    deviceName: string | null;
  }): Promise<WebAuthnCredentialRecord> {
    const em = this.em.fork();
    const row = new WebAuthnCredentialEntity();
    row.id = randomUUID();
    row.userId = input.userId;
    row.credentialId = input.credentialId;
    row.publicKey = input.publicKey;
    row.counter = String(input.counter);
    row.transports = input.transports;
    row.deviceName = input.deviceName;
    em.persist(row);
    await em.flush();
    return this.toRecord(row);
  }

  async findByCredentialId(credentialId: string): Promise<WebAuthnCredentialRecord | null> {
    const e = await this.em.fork().findOne(WebAuthnCredentialEntity, { credentialId });
    return e ? this.toRecord(e) : null;
  }

  async listByUser(userId: string): Promise<WebAuthnCredentialRecord[]> {
    const rows = await this.em
      .fork()
      .find(WebAuthnCredentialEntity, { userId }, { orderBy: { createdAt: 'asc' } });
    return rows.map((r) => this.toRecord(r));
  }

  async updateOnUse(credentialId: string, counter: number): Promise<void> {
    const em = this.em.fork();
    const e = await em.findOne(WebAuthnCredentialEntity, { credentialId });
    if (e) {
      e.counter = String(counter);
      e.lastUsedAt = new Date();
      await em.flush();
    }
  }

  async deleteForUser(userId: string, id: string): Promise<boolean> {
    const n = await this.em.fork().nativeDelete(WebAuthnCredentialEntity, { id, userId });
    return n > 0;
  }
}

@Injectable()
export class MikroOrmMembershipRepository implements MembershipRepository {
  constructor(private readonly em: EntityManager) {}

  async grant(userId: string, shopId: string, role: ShopRole): Promise<void> {
    const em = this.em.fork();
    const existing = await em.findOne(ShopMembershipEntity, { userId, shopId });
    const entity = existing ?? new ShopMembershipEntity();
    entity.id = existing?.id ?? randomUUID();
    entity.userId = userId;
    entity.shopId = shopId;
    entity.role = role;
    em.persist(entity);
    await em.flush();
  }

  async listByUser(userId: string): Promise<MembershipRecord[]> {
    const em = this.em.fork();
    const rows = await em.find(ShopMembershipEntity, { userId });
    if (rows.length === 0) return [];
    const shops = await em.find(ShopEntity, { id: { $in: rows.map((r) => r.shopId) } });
    const slugById = new Map(shops.map((s) => [s.id, s.slug]));
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      shopId: r.shopId,
      slug: slugById.get(r.shopId) ?? '',
      role: r.role,
    }));
  }

  async listMembers(shopId: string): Promise<ShopMemberContact[]> {
    const em = this.em.fork();
    const rows = await em.find(ShopMembershipEntity, { shopId });
    if (rows.length === 0) return [];
    const users = await em.find(UserEntity, { id: { $in: rows.map((r) => r.userId) } });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows
      .map((r) => {
        const u = byId.get(r.userId);
        return u ? { userId: r.userId, email: u.email, name: u.name, role: r.role } : null;
      })
      .filter((x): x is ShopMemberContact => x !== null);
  }

  async find(userId: string, shopId: string): Promise<MembershipRecord | null> {
    const em = this.em.fork();
    const r = await em.findOne(ShopMembershipEntity, { userId, shopId });
    if (!r) return null;
    const shop = await em.findOne(ShopEntity, { id: shopId });
    return {
      id: r.id,
      userId: r.userId,
      shopId: r.shopId,
      slug: shop?.slug ?? '',
      role: r.role,
    };
  }
}

@Injectable()
export class MikroOrmSessionRepository implements SessionRepository {
  constructor(private readonly em: EntityManager) {}

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
  }): Promise<SessionRecord> {
    const em = this.em.fork();
    const entity = new AuthSessionEntity();
    entity.id = randomUUID();
    entity.userId = input.userId;
    entity.refreshTokenHash = input.refreshTokenHash;
    entity.expiresAt = input.expiresAt;
    entity.userAgent = input.userAgent ?? null;
    em.persist(entity);
    await em.flush();
    return { id: entity.id, userId: entity.userId };
  }

  async findValidByHash(hash: string): Promise<SessionRecord | null> {
    const e = await this.em
      .fork()
      .findOne(AuthSessionEntity, { refreshTokenHash: hash, revokedAt: null });
    if (!e || e.expiresAt.getTime() < Date.now()) return null;
    return { id: e.id, userId: e.userId };
  }

  async revokeByHash(hash: string): Promise<void> {
    const em = this.em.fork();
    const e = await em.findOne(AuthSessionEntity, { refreshTokenHash: hash });
    if (e && !e.revokedAt) {
      e.revokedAt = new Date();
      await em.flush();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const em = this.em.fork();
    await em.nativeUpdate(
      AuthSessionEntity,
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }
}
