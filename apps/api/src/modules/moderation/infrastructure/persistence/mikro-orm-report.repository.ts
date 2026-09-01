import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import type { CreateReportInput } from '@jokko/contracts';
import type { ReportRepository } from '../../domain/ports';
import { ContentReportEntity } from './content-report.entity';

@Injectable()
export class MikroOrmReportRepository implements ReportRepository {
  constructor(private readonly em: EntityManager) {}

  private withShop<T>(shopId: string, fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.em.fork().transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  async create(shopId: string, input: CreateReportInput): Promise<{ created: boolean }> {
    try {
      return await this.withShop(shopId, async (em) => {
        const row = new ContentReportEntity();
        row.shopId = shopId;
        row.targetType = input.targetType;
        row.targetId = input.targetId;
        row.reason = input.reason;
        row.note = input.note ?? null;
        row.reporterKey = input.reporterKey ?? '';
        await em.persistAndFlush(row);
        return { created: true };
      });
    } catch (err) {
      // Index unique partiel (shop, cible, auteur) sur les « pending » → doublon toléré.
      if (err instanceof UniqueConstraintViolationException) return { created: false };
      throw err;
    }
  }

  async countRecent(shopId: string, sinceMs: number): Promise<number> {
    return this.withShop(shopId, (em) =>
      em.count(ContentReportEntity, { createdAt: { $gte: new Date(Date.now() - sinceMs) } }),
    );
  }
}
