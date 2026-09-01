import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { BillingSummary } from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import { Subscription } from '../domain/subscription.aggregate';
import {
  PAYMENT_GATEWAY,
  PAYMENT_LOG_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  type PaymentGateway,
  type PaymentLogRepository,
  type SubscriptionRepository,
} from '../domain/ports';

@Injectable()
export class BillingService {
  private readonly cfg: AppConfig['billing'];

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subs: SubscriptionRepository,
    @Inject(PAYMENT_LOG_REPOSITORY) private readonly payments: PaymentLogRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {
    this.cfg = config.get('billing', { infer: true });
  }

  /** Récupère l'abonnement, en créant un essai à la volée si absent. */
  async getOrCreate(shopId: string): Promise<Subscription> {
    const existing = await this.subs.find(shopId);
    if (existing) return existing;
    const trial = Subscription.startTrial(shopId, this.cfg.trialDays);
    await this.subs.save(trial);
    return trial;
  }

  async summary(shopId: string): Promise<BillingSummary> {
    const sub = await this.getOrCreate(shopId);
    const snap = sub.toSnapshot();
    return {
      plan: snap.plan,
      status: snap.status,
      currentPeriodEnd: snap.currentPeriodEnd,
      entitled: sub.isEntitled(this.cfg.graceDays),
      priceXof: this.cfg.priceXof,
      currency: 'XOF',
    };
  }

  async checkout(shopId: string, email: string, returnUrl?: string): Promise<{ url: string }> {
    await this.getOrCreate(shopId);
    const txRef = `jokko-${shopId.slice(0, 8)}-${randomBytes(6).toString('hex')}`;
    await this.payments.create(shopId, txRef, this.cfg.priceXof, 'XOF');

    const dest = returnUrl ?? `${this.cfg.appPublicUrl}/s/${shopId}/billing`;
    return this.gateway.createCheckout({
      txRef,
      amount: this.cfg.priceXof,
      currency: 'XOF',
      email,
      returnUrl: dest,
      meta: { shopId },
    });
  }
}
