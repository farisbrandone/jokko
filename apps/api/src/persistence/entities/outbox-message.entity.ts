import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/**
 * Transactional Outbox — une ligne par événement métier, écrite dans la même
 * transaction que l'agrégat. Un relais la publie ensuite puis marque `processedAt`.
 * Pas de RLS : table d'infrastructure, lue tous locataires confondus par le relais.
 *
 * Types explicites sur chaque colonne : l'app tourne aussi bien sous tsc (nest build)
 * que sous esbuild (tsx pour les scripts), qui n'émet pas de métadonnées de décorateur.
 */
@Entity({ tableName: 'outbox_messages' })
export class OutboxMessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'string', length: 120 })
  name!: string;

  @Property({ type: 'uuid', fieldName: 'aggregate_id' })
  aggregateId!: string;

  @Property({ type: 'uuid', fieldName: 'shop_id', nullable: true })
  shopId: string | null = null;

  @Property({ type: 'json' })
  payload: Record<string, unknown> = {};

  @Property({ type: 'json', fieldName: 'cache_tags' })
  cacheTags: string[] = [];

  @Property({ type: 'datetime', fieldName: 'occurred_at' })
  occurredAt: Date = new Date();

  @Index()
  @Property({ type: 'datetime', fieldName: 'processed_at', nullable: true })
  processedAt: Date | null = null;
}
