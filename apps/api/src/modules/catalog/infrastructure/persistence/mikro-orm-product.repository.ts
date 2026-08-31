import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Product } from '../../domain/product.aggregate';
import type {
  ProductPage,
  ProductRepository,
} from '../../domain/ports/product.repository';
import { TenantContext } from '../../../../shared/tenant/tenant-context';
import { OutboxMessageEntity } from '../../../../persistence/entities/outbox-message.entity';
import { ProductEntity } from './product.entity';
import { ProductMapper } from './product.mapper';

/**
 * Repository PostgreSQL du catalogue. Chaque opération s'exécute dans une
 * transaction qui pose `app.current_shop_id` : la Row-Level Security garantit
 * qu'aucune ligne d'une autre boutique n'est lisible ni modifiable. Les
 * événements métier de l'agrégat sont écrits dans l'Outbox dans la même
 * transaction (pattern Transactional Outbox).
 */
@Injectable()
export class MikroOrmProductRepository implements ProductRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly tenant: TenantContext,
  ) {}

  private async withTenant<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    const shopId = this.tenant.getShopId();
    return this.em.transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  async save(product: Product): Promise<void> {
    await this.withTenant(async (em) => {
      const existing = await em.findOne(ProductEntity, { id: product.id.value });
      const entity = ProductMapper.assign(existing ?? new ProductEntity(), product);
      em.persist(entity);

      for (const event of product.pullDomainEvents()) {
        const message = new OutboxMessageEntity();
        message.name = event.name;
        message.aggregateId = event.aggregateId;
        message.shopId = event.shopId;
        message.payload = event.payload;
        message.cacheTags = event.cacheTags ?? [];
        message.occurredAt = event.occurredAt;
        em.persist(message);
      }
    });
  }

  async findById(_shopId: string, productId: string): Promise<Product | null> {
    return this.withTenant(async (em) => {
      const entity = await em.findOne(ProductEntity, { id: productId });
      return entity ? ProductMapper.toDomain(entity) : null;
    });
  }

  async findByShop(
    _shopId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ProductPage> {
    return this.withTenant(async (em) => {
      const [rows, total] = await em.findAndCount(
        ProductEntity,
        {},
        {
          limit: pagination.pageSize,
          offset: (pagination.page - 1) * pagination.pageSize,
          orderBy: { createdAt: 'desc' },
        },
      );
      return { items: rows.map((r) => ProductMapper.toDomain(r)), total };
    });
  }
}
