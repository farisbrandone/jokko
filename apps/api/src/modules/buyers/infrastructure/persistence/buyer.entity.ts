import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { BuyerAddress } from '../../domain/buyer.aggregate';

/** `buyers` : compte acheteur léger, global (indépendant des boutiques). */
@Entity({ tableName: 'buyers' })
export class BuyerEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Unique()
  @Property({ type: 'string', length: 20 })
  phone!: string;

  @Property({ type: 'string', length: 80, nullable: true })
  name: string | null = null;

  @Property({ type: 'json' })
  addresses: BuyerAddress[] = [];

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}
