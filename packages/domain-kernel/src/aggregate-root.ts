import { Entity } from './entity';
import { DomainEvent } from './domain-event';
import { UniqueId } from './unique-id';

/**
 * AggregateRoot — point d'entrée d'un agrégat. Garantit les invariants et
 * accumule les événements métier à publier après persistance.
 */
export abstract class AggregateRoot extends Entity {
  private _domainEvents: DomainEvent[] = [];

  protected constructor(id?: UniqueId) {
    super(id);
  }

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }
}
