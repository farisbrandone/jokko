import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { DisputeStatus } from '@jokko/contracts';
import { Dispute } from '../../domain/dispute.aggregate';
import type { DisputeRepository } from '../../domain/ports';
import { DisputeEntity } from './dispute.entity';

@Injectable()
export class MikroOrmDisputeRepository implements DisputeRepository {
  constructor(private readonly em: EntityManager) {}

  private toDomain(row: DisputeEntity): Dispute {
    return Dispute.restore({
      id: row.id,
      shopId: row.shopId,
      orderId: row.orderId,
      buyerPhone: row.buyerPhone,
      reason: row.reason,
      description: row.description,
      status: row.status,
      sellerResponse: row.sellerResponse,
      resolution: row.resolution,
      resolutionNote: row.resolutionNote,
      escalationNote: row.escalationNote,
      adminNote: row.adminNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      escalatedAt: row.escalatedAt ? row.escalatedAt.toISOString() : null,
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    });
  }

  async findById(id: string): Promise<Dispute | null> {
    const row = await this.em.fork().findOne(DisputeEntity, { id });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByOrderId(orderId: string): Promise<Dispute | null> {
    const row = await this.em
      .fork()
      .findOne(
        DisputeEntity,
        { orderId, status: { $ne: 'closed' as DisputeStatus } },
        { orderBy: { createdAt: 'desc' } },
      );
    return row ? this.toDomain(row) : null;
  }

  async listForShop(shopId: string, status?: DisputeStatus): Promise<Dispute[]> {
    const where = status ? { shopId, status } : { shopId };
    const rows = await this.em
      .fork()
      .find(DisputeEntity, where, { orderBy: { createdAt: 'desc' }, limit: 200 });
    return rows.map((r) => this.toDomain(r));
  }

  async save(dispute: Dispute): Promise<void> {
    const em = this.em.fork();
    const s = dispute.toSnapshot();
    const row = (await em.findOne(DisputeEntity, { id: s.id })) ?? new DisputeEntity();
    row.id = s.id;
    row.shopId = s.shopId;
    row.orderId = s.orderId;
    row.buyerPhone = s.buyerPhone;
    row.reason = s.reason;
    row.description = s.description;
    row.status = s.status;
    row.sellerResponse = s.sellerResponse;
    row.resolution = s.resolution;
    row.resolutionNote = s.resolutionNote;
    row.escalationNote = s.escalationNote;
    row.adminNote = s.adminNote;
    row.createdAt = new Date(s.createdAt);
    row.updatedAt = new Date(s.updatedAt);
    row.escalatedAt = s.escalatedAt ? new Date(s.escalatedAt) : null;
    row.closedAt = s.closedAt ? new Date(s.closedAt) : null;
    await em.persistAndFlush(row);
  }
}
