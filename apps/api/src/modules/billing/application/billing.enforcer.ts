import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import type { AppConfig } from '../../../config/configuration';
import { SHOP_REPOSITORY, type ShopRepository } from '../../shop/domain/ports/shop.repository';
import { SUBSCRIPTION_REPOSITORY, type SubscriptionRepository } from '../domain/ports';

/**
 * Suspend les boutiques dont l'abonnement est échu au-delà de la fenêtre de
 * grâce. La réactivation se fait sur paiement (ApplyPaymentUseCase) ou à la main
 * par un administrateur.
 */
@Injectable()
export class BillingEnforcer {
  private readonly logger = new Logger(BillingEnforcer.name);
  private readonly graceDays: number;

  constructor(
    config: ConfigService<AppConfig, true>,
    // requis par @CreateRequestContext pour ouvrir un contexte EM
    private readonly em: EntityManager,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subs: SubscriptionRepository,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {
    this.graceDays = config.get('billing', { infer: true }).graceDays;
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'billing-enforcer' })
  @CreateRequestContext()
  async enforce(): Promise<void> {
    void this.em; // @CreateRequestContext lit `this.em` pour ouvrir le contexte
    const lapsed = await this.subs.listLapsed(this.graceDays);
    if (lapsed.length === 0) return;

    let suspended = 0;
    for (const sub of lapsed) {
      try {
        sub.markPastDue();
        await this.subs.save(sub);
        const shop = await this.shops.findById(sub.shopId);
        if (shop && shop.status === 'active') {
          shop.suspend();
          await this.shops.save(shop);
          suspended++;
        }
      } catch (err) {
        this.logger.error(`échec d'application pour ${sub.shopId}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`abonnements échus: ${lapsed.length}, boutiques suspendues: ${suspended}`);
  }
}
