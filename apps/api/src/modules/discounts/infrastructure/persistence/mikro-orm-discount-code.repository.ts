import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DiscountCode } from '../../domain/discount-code.aggregate';
import type { DiscountCodeRepository } from '../../domain/ports';
import { DiscountCodeEntity } from './discount-code.entity';

@Injectable()
export class MikroOrmDiscountCodeRepository implements DiscountCodeRepository {
  constructor(private readonly em: EntityManager) {}

  private toDomain(row: DiscountCodeEntity): DiscountCode {
    return DiscountCode.restore({
      id: row.id,
      shopId: row.shopId,
      code: row.code,
      kind: row.kind,
      value: row.value,
      minSubtotal: row.minSubtotal,
      maxRedemptions: row.maxRedemptions,
      redeemedCount: row.redeemedCount,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    });
  }

  async listForShop(shopId: string): Promise<DiscountCode[]> {
    const rows = await this.em.fork().find(
      DiscountCodeEntity,
      { shopId },
      { orderBy: { createdAt: 'desc' }, limit: 200 },
    );
    return rows.map((r) => this.toDomain(r));
  }

  async findByShopAndId(shopId: string, id: string): Promise<DiscountCode | null> {
    const row = await this.em.fork().findOne(DiscountCodeEntity, { id, shopId });
    return row ? this.toDomain(row) : null;
  }

  async findByShopAndCode(shopId: string, code: string): Promise<DiscountCode | null> {
    const row = await this.em
      .fork()
      .findOne(DiscountCodeEntity, { shopId, code: code.trim().toUpperCase() });
    return row ? this.toDomain(row) : null;
  }

  async save(discount: DiscountCode): Promise<void> {
    const em = this.em.fork();
    const s = discount.toSnapshot();
    const row = (await em.findOne(DiscountCodeEntity, { id: s.id })) ?? new DiscountCodeEntity();
    row.id = s.id;
    row.shopId = s.shopId;
    row.code = s.code;
    row.kind = s.kind;
    row.value = s.value;
    row.minSubtotal = s.minSubtotal;
    row.maxRedemptions = s.maxRedemptions;
    row.redeemedCount = s.redeemedCount;
    row.expiresAt = s.expiresAt ? new Date(s.expiresAt) : null;
    row.active = s.active;
    row.createdAt = new Date(s.createdAt);
    await em.persistAndFlush(row);
  }

  async delete(shopId: string, id: string): Promise<boolean> {
    const em = this.em.fork();
    const row = await em.findOne(DiscountCodeEntity, { id, shopId });
    if (!row) return false;
    await em.removeAndFlush(row);
    return true;
  }
}
