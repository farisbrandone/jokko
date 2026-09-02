import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Shop } from '../../domain/shop.aggregate';
import type { ShopRepository } from '../../domain/ports/shop.repository';
import { ShopEntity } from './shop.entity';
import { ShopMapper } from './shop.mapper';

/** `shops` n'a pas de RLS : c'est le registre des tenants, résolu avant tout contexte boutique. */
@Injectable()
export class MikroOrmShopRepository implements ShopRepository {
  constructor(private readonly em: EntityManager) {}

  async save(shop: Shop): Promise<void> {
    const em = this.em.fork();
    const existing = await em.findOne(ShopEntity, { id: shop.id.value });
    em.persist(ShopMapper.assign(existing ?? new ShopEntity(), shop));
    // Les événements de domaine du Shop seront branchés à l'Outbox à l'unification
    // de l'écriture Shop + Membership dans une transaction (incrément suivant).
    shop.pullDomainEvents();
    await em.flush();
  }

  async findById(id: string): Promise<Shop | null> {
    const entity = await this.em.fork().findOne(ShopEntity, { id });
    return entity ? ShopMapper.toDomain(entity) : null;
  }

  async findBySlug(slug: string): Promise<Shop | null> {
    const entity = await this.em.fork().findOne(ShopEntity, { slug });
    return entity ? ShopMapper.toDomain(entity) : null;
  }

  /** Seuls les domaines personnalisés VÉRIFIÉS résolvent une boutique. */
  async findByCustomDomain(domain: string): Promise<Shop | null> {
    const entity = await this.em.fork().findOne(ShopEntity, {
      customDomain: domain.toLowerCase(),
      customDomainVerifiedAt: { $ne: null },
    });
    return entity ? ShopMapper.toDomain(entity) : null;
  }
}
