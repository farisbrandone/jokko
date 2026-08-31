import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ProductSnapshot } from '../../catalog/domain/product.aggregate';
import type { OutboxEnvelope } from '../../catalog/infrastructure/outbox/outbox.relay';
import { ProductIndex } from '../infrastructure/product-index';

/**
 * Maintient l'index Meilisearch à jour à partir des événements catalogue
 * rejoués par l'Outbox. L'instantané produit voyage dans l'événement.
 */
@Injectable()
export class CatalogIndexListener {
  private readonly logger = new Logger(CatalogIndexListener.name);

  constructor(private readonly index: ProductIndex) {}

  @OnEvent('catalog.product.created')
  @OnEvent('catalog.product.updated')
  @OnEvent('catalog.product.published')
  @OnEvent('catalog.product.unpublished')
  async onProductUpserted(envelope: OutboxEnvelope): Promise<void> {
    const product = envelope.payload.product as ProductSnapshot | undefined;
    if (!product) return;
    await this.index.upsert(product);
    this.logger.debug(`indexé ${product.id} (${envelope.name})`);
  }
}
