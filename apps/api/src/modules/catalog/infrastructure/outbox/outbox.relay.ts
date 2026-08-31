import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { OutboxMessageEntity } from '../../../../persistence/entities/outbox-message.entity';

/**
 * Relais de l'Outbox : publie les événements métier accumulés en base puis les
 * marque traités. Pour l'instant la « publication » se limite à un log ; les
 * incréments suivants brancheront ici le bus d'événements et l'appel de
 * revalidation (`revalidateTag`) du frontend.
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);
  private running = false;

  constructor(private readonly em: EntityManager) {}

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
        this.logger.log(
          `→ ${message.name} shop=${message.shopId ?? 'plateforme'} tags=[${message.cacheTags.join(', ')}]`,
        );
        message.processedAt = new Date();
      }
      await this.em.flush();
    } catch (error) {
      this.logger.error(`échec du relais outbox: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
