import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Buyer } from '../../domain/buyer.aggregate';
import type { BuyerRepository } from '../../domain/ports';
import { BuyerEntity } from './buyer.entity';

@Injectable()
export class MikroOrmBuyerRepository implements BuyerRepository {
  constructor(private readonly em: EntityManager) {}

  private toDomain(row: BuyerEntity): Buyer {
    return Buyer.restore({
      id: row.id,
      phone: row.phone,
      name: row.name,
      addresses: row.addresses,
      createdAt: row.createdAt.toISOString(),
    });
  }

  async findByPhone(phone: string): Promise<Buyer | null> {
    const row = await this.em.fork().findOne(BuyerEntity, { phone });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<Buyer | null> {
    const row = await this.em.fork().findOne(BuyerEntity, { id });
    return row ? this.toDomain(row) : null;
  }

  async save(buyer: Buyer): Promise<void> {
    const em = this.em.fork();
    const s = buyer.toSnapshot();
    const row = (await em.findOne(BuyerEntity, { id: s.id })) ?? new BuyerEntity();
    row.id = s.id;
    row.phone = s.phone;
    row.name = s.name;
    row.addresses = s.addresses;
    row.createdAt = new Date(s.createdAt);
    await em.persistAndFlush(row);
  }
}
