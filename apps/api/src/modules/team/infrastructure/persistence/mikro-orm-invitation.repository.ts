import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ShopRole } from '@jokko/contracts';
import type { InvitationRecord, InvitationRepository } from '../../domain/ports';
import { ShopInvitationEntity } from './invitation.entity';

type Input = {
  shopId: string;
  email: string;
  role: ShopRole;
  tokenHash: string;
  invitedBy: string | null;
  expiresAt: Date;
};

@Injectable()
export class MikroOrmInvitationRepository implements InvitationRepository {
  constructor(private readonly em: EntityManager) {}

  private toRecord(e: ShopInvitationEntity): InvitationRecord {
    return {
      id: e.id,
      shopId: e.shopId,
      email: e.email,
      role: e.role,
      invitedBy: e.invitedBy,
      expiresAt: e.expiresAt,
      acceptedAt: e.acceptedAt,
      createdAt: e.createdAt,
    };
  }

  async create(input: Input): Promise<InvitationRecord> {
    const em = this.em.fork();
    const row = this.build(input);
    em.persist(row);
    await em.flush();
    return this.toRecord(row);
  }

  async upsertPending(input: Input): Promise<InvitationRecord> {
    const em = this.em.fork();
    const existing = await em.findOne(ShopInvitationEntity, {
      shopId: input.shopId,
      email: input.email,
      acceptedAt: null,
    });
    if (existing) {
      existing.role = input.role;
      existing.tokenHash = input.tokenHash;
      existing.invitedBy = input.invitedBy;
      existing.expiresAt = input.expiresAt;
      existing.createdAt = new Date();
      await em.flush();
      return this.toRecord(existing);
    }
    const row = this.build(input);
    em.persist(row);
    await em.flush();
    return this.toRecord(row);
  }

  async findByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
    const e = await this.em.fork().findOne(ShopInvitationEntity, { tokenHash });
    return e ? this.toRecord(e) : null;
  }

  async listPending(shopId: string): Promise<InvitationRecord[]> {
    const rows = await this.em
      .fork()
      .find(
        ShopInvitationEntity,
        { shopId, acceptedAt: null },
        { orderBy: { createdAt: 'desc' } },
      );
    return rows.map((r) => this.toRecord(r));
  }

  async markAccepted(id: string): Promise<void> {
    const em = this.em.fork();
    const e = await em.findOne(ShopInvitationEntity, { id });
    if (e && !e.acceptedAt) {
      e.acceptedAt = new Date();
      await em.flush();
    }
  }

  async deletePending(id: string, shopId: string): Promise<boolean> {
    const n = await this.em
      .fork()
      .nativeDelete(ShopInvitationEntity, { id, shopId, acceptedAt: null });
    return n > 0;
  }

  private build(input: Input): ShopInvitationEntity {
    const row = new ShopInvitationEntity();
    row.id = randomUUID();
    row.shopId = input.shopId;
    row.email = input.email;
    row.role = input.role;
    row.tokenHash = input.tokenHash;
    row.invitedBy = input.invitedBy;
    row.expiresAt = input.expiresAt;
    return row;
  }
}
