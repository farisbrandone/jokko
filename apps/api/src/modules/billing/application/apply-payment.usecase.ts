import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import { SHOP_REPOSITORY, type ShopRepository } from '../../shop/domain/ports/shop.repository';
import {
  PAYMENT_GATEWAY,
  PAYMENT_LOG_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
  type PaymentGateway,
  type PaymentLogRepository,
  type SubscriptionRepository,
} from '../domain/ports';
import { Subscription } from '../domain/subscription.aggregate';

/** Applique un paiement (webhook ou retour) : idempotent par `tx_ref`. */
@Injectable()
export class ApplyPaymentUseCase {
  private readonly logger = new Logger(ApplyPaymentUseCase.name);
  private readonly trialDays: number;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subs: SubscriptionRepository,
    @Inject(PAYMENT_LOG_REPOSITORY) private readonly payments: PaymentLogRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {
    this.trialDays = config.get('billing', { infer: true }).trialDays;
  }

  async execute(
    txRef: string,
    expectedShopId?: string,
  ): Promise<'applied' | 'ignored' | 'failed'> {
    const payment = await this.payments.findByTxRef(txRef);
    if (!payment) {
      this.logger.warn(`paiement inconnu: ${txRef}`);
      return 'ignored';
    }
    if (expectedShopId && payment.shopId !== expectedShopId) return 'ignored';
    if (payment.status === 'succeeded') return 'ignored'; // déjà appliqué

    const verified = await this.gateway.verifyByReference(txRef);
    if (verified.status !== 'successful') {
      if (verified.status === 'failed') await this.payments.markFailed(txRef);
      return verified.status === 'failed' ? 'failed' : 'ignored';
    }
    // Montant : on tolère 0 (passerelle fake) mais on refuse un sous-paiement réel.
    if (verified.amount > 0 && verified.amount < payment.amount) {
      await this.payments.markFailed(txRef);
      return 'failed';
    }

    await this.payments.markSucceeded(txRef, verified.providerTxId);

    const sub =
      (await this.subs.find(payment.shopId)) ??
      Subscription.startTrial(payment.shopId, this.trialDays);
    sub.renew(1, verified.providerTxId);
    await this.subs.save(sub);

    // Réactive la boutique si elle avait été suspendue pour impayé.
    const shop = await this.shops.findById(payment.shopId);
    if (shop && shop.status === 'suspended') {
      shop.activate();
      await this.shops.save(shop);
    }

    this.logger.log(`abonnement prolongé pour ${payment.shopId} (${txRef})`);
    return 'applied';
  }
}
