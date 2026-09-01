import type { SubscriptionPlan, SubscriptionStatus } from '@jokko/contracts';

const DAY_MS = 86_400_000;

export interface SubscriptionSnapshot {
  shopId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Abonnement d'une boutique. Un essai gratuit démarre à la création ; un
 * paiement réussi le fait passer en `pro` et prolonge la période.
 */
export class Subscription {
  private constructor(
    readonly shopId: string,
    private _plan: SubscriptionPlan,
    private _status: SubscriptionStatus,
    private _currentPeriodEnd: Date,
    private _providerRef: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static startTrial(shopId: string, trialDays: number, now = new Date()): Subscription {
    return new Subscription(
      shopId,
      'trial',
      'trialing',
      new Date(now.getTime() + trialDays * DAY_MS),
      null,
      now,
      now,
    );
  }

  static restore(snap: SubscriptionSnapshot): Subscription {
    return new Subscription(
      snap.shopId,
      snap.plan,
      snap.status,
      new Date(snap.currentPeriodEnd),
      snap.providerRef,
      new Date(snap.createdAt),
      new Date(snap.updatedAt),
    );
  }

  /** Prolonge d'un ou plusieurs mois (cumulatif si encore actif). */
  renew(months: number, providerRef: string, now = new Date()): void {
    const base = this._currentPeriodEnd > now ? this._currentPeriodEnd : now;
    const end = new Date(base);
    end.setMonth(end.getMonth() + months);
    this._currentPeriodEnd = end;
    this._plan = 'pro';
    this._status = 'active';
    this._providerRef = providerRef;
    this._updatedAt = now;
  }

  markPastDue(now = new Date()): void {
    if (this._status === 'canceled') return;
    this._status = 'past_due';
    this._updatedAt = now;
  }

  /** Boutique servie : période en cours, ou dans la fenêtre de grâce. */
  isEntitled(graceDays: number, now = new Date()): boolean {
    return now.getTime() <= this._currentPeriodEnd.getTime() + graceDays * DAY_MS;
  }

  get status(): SubscriptionStatus {
    return this._status;
  }

  get currentPeriodEnd(): Date {
    return this._currentPeriodEnd;
  }

  toSnapshot(): SubscriptionSnapshot {
    return {
      shopId: this.shopId,
      plan: this._plan,
      status: this._status,
      currentPeriodEnd: this._currentPeriodEnd.toISOString(),
      providerRef: this._providerRef,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
