import { Injectable, Logger } from '@nestjs/common';
import type { Product } from '../../domain/product.aggregate';
import type {
  ProductPage,
  ProductRepository,
} from '../../domain/ports/product.repository';

/**
 * Implémentation de démarrage, en mémoire. Sera remplacée par un repository
 * MikroORM (PostgreSQL + RLS) à l'incrément suivant. Publie aussi, pour l'instant,
 * les événements métier dans les logs (l'Outbox arrive avec la persistance réelle).
 */
@Injectable()
export class InMemoryProductRepository implements ProductRepository {
  private readonly logger = new Logger(InMemoryProductRepository.name);
  private readonly store = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.store.set(product.id.value, product);
    for (const event of product.pullDomainEvents()) {
      this.logger.log(
        `event ${event.name} aggregate=${event.aggregateId} shop=${event.shopId} tags=[${(
          event.cacheTags ?? []
        ).join(', ')}]`,
      );
    }
  }

  async findById(shopId: string, productId: string): Promise<Product | null> {
    const product = this.store.get(productId);
    return product && product.belongsTo(shopId) ? product : null;
  }

  async findByShop(
    shopId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ProductPage> {
    const all = [...this.store.values()].filter((p) => p.belongsTo(shopId));
    const start = (pagination.page - 1) * pagination.pageSize;
    return {
      items: all.slice(start, start + pagination.pageSize),
      total: all.length,
    };
  }
}
