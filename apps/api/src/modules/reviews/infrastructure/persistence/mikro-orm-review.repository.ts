import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  CreateReviewInput,
  Review,
  ReviewStatus,
  ReviewSummary,
} from '@jokko/contracts';
import type { ReviewRepository } from '../../domain/ports';
import { ProductReviewEntity } from './review.entity';

@Injectable()
export class MikroOrmReviewRepository implements ReviewRepository {
  constructor(private readonly em: EntityManager) {}

  private withShop<T>(shopId: string, fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.em.fork().transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  private toDto(e: ProductReviewEntity): Review {
    return {
      id: e.id,
      productId: e.productId,
      rating: e.rating,
      title: e.title,
      body: e.body,
      authorName: e.authorName,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    };
  }

  async create(
    shopId: string,
    productId: string,
    input: CreateReviewInput,
  ): Promise<Review> {
    return this.withShop(shopId, async (em) => {
      const row = new ProductReviewEntity();
      row.id = randomUUID();
      row.shopId = shopId;
      row.productId = productId;
      row.rating = input.rating;
      row.title = input.title?.trim() || null;
      row.body = input.body.trim();
      row.authorName = input.authorName.trim();
      row.status = 'pending';
      await em.persistAndFlush(row);
      return this.toDto(row);
    });
  }

  async publicForProduct(
    shopId: string,
    productId: string,
  ): Promise<{ summary: ReviewSummary; items: Review[] }> {
    return this.withShop(shopId, async (em) => {
      const rows = await em.find(
        ProductReviewEntity,
        { productId, status: 'published' },
        { orderBy: { createdAt: 'desc' } },
      );
      const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      let sum = 0;
      for (const r of rows) {
        distribution[r.rating - 1] += 1;
        sum += r.rating;
      }
      const count = rows.length;
      return {
        summary: {
          average: count ? Math.round((sum / count) * 10) / 10 : 0,
          count,
          distribution,
        },
        items: rows.map((r) => this.toDto(r)),
      };
    });
  }

  async listForShop(shopId: string, status?: ReviewStatus): Promise<Review[]> {
    return this.withShop(shopId, async (em) => {
      const rows = await em.find(
        ProductReviewEntity,
        status ? { status } : {},
        { orderBy: { createdAt: 'desc' }, limit: 200 },
      );
      return rows.map((r) => this.toDto(r));
    });
  }

  async setStatus(shopId: string, id: string, status: ReviewStatus): Promise<Review | null> {
    return this.withShop(shopId, async (em) => {
      const row = await em.findOne(ProductReviewEntity, { id });
      if (!row) return null;
      row.status = status;
      await em.flush();
      return this.toDto(row);
    });
  }
}
