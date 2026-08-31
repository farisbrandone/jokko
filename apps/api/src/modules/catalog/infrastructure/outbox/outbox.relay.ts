import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { OutboxMessageEntity } from '../../../../persistence/entities/outbox-message.entity';

export interface OutboxEnvelope {
  name: string;
  aggregateId: string;
  shopId: string | null;
  payload: Record<string, unknown>;
  cacheTags: string[];
  occurredAt: Date;
}

/**
 * Relais de l'Outbox : rejoue les événements métier en émettant sur le bus
 * in-process (EventEmitter2) puis les marque traités. Les consommateurs
 * (indexeur de recherche, futur appel `revalidateTag` du frontend) s'y abonnent
 * via `@OnEvent('catalog.product.*')`.
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);
  private running = false;

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventEmitter2,
  ) {}

  @Interval('outbox-relay', 2000)
  @CreateRequestContext()
  async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const batch = await this.em.find(
        OutboxMessageEntity,
        { processedAt: null },
        { limit: 50, orderBy: { occurredAt: 'asc' } },
      );
      if (batch.length === 0) return;

      for (const message of batch) {
        const envelope: OutboxEnvelope = {
          name: message.name,
          aggregateId: message.aggregateId,
          shopId: message.shopId,
          payload: message.payload,
          cacheTags: message.cacheTags,
          occurredAt: message.occurredAt,
        };
        try {
          await this.events.emitAsync(message.name, envelope);
          message.processedAt = new Date();
        } catch (err) {
          this.logger.error(
            `consommateur en échec pour ${message.name} (${message.aggregateId}): ${(err as Error).message}`,
          );
          // laissé non traité → réessai au prochain tick
        }
      }
      await this.em.flush();
    } catch (error) {
      this.logger.error(`échec du relais outbox: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
