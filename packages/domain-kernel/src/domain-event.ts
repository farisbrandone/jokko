/**
 * Événement métier. Émis par un agrégat, collecté puis publié après commit
 * (pattern Transactional Outbox côté infrastructure).
 */
export interface DomainEvent {
  /** Nom stable, ex. "catalog.product.created" */
  readonly name: string;
  /** Id de l'agrégat concerné */
  readonly aggregateId: string;
  /** Boutique propriétaire (multi-tenant). Null pour les événements plateforme. */
  readonly shopId: string | null;
  readonly occurredAt: Date;
  /** Charge utile sérialisable */
  readonly payload: Record<string, unknown>;
  /** Tags de cache que le frontend consommera pour revalider (ISR). */
  readonly cacheTags?: string[];
}

export abstract class BaseDomainEvent implements DomainEvent {
  abstract readonly name: string;
  readonly occurredAt: Date = new Date();

  protected constructor(
    public readonly aggregateId: string,
    public readonly shopId: string | null,
    public readonly payload: Record<string, unknown> = {},
    public readonly cacheTags: string[] = [],
  ) {}
}
