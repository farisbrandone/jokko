import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { ApplyPaymentUseCase } from './application/apply-payment.usecase';
import { BillingEnforcer } from './application/billing.enforcer';
import { BillingService } from './application/billing.service';
import {
  PAYMENT_GATEWAY,
  PAYMENT_LOG_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
} from './domain/ports';
import { FakePaymentGateway, FlutterwaveGateway } from './infrastructure/flutterwave.gateway';
import { MikroOrmPaymentLogRepository } from './infrastructure/persistence/mikro-orm-payment-log.repository';
import { MikroOrmSubscriptionRepository } from './infrastructure/persistence/mikro-orm-subscription.repository';
import { BillingController } from './presentation/billing.controller';
import { BillingWebhookController } from './presentation/billing-webhook.controller';

const gatewayProvider: Provider = {
  provide: PAYMENT_GATEWAY,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const flw = config.get('billing', { infer: true }).flutterwave;
    return flw ? new FlutterwaveGateway(flw) : new FakePaymentGateway();
  },
};

@Module({
  imports: [IdentityModule, ShopModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [
    BillingService,
    ApplyPaymentUseCase,
    BillingEnforcer,
    gatewayProvider,
    { provide: SUBSCRIPTION_REPOSITORY, useClass: MikroOrmSubscriptionRepository },
    { provide: PAYMENT_LOG_REPOSITORY, useClass: MikroOrmPaymentLogRepository },
  ],
  exports: [BillingService, SUBSCRIPTION_REPOSITORY],
})
export class BillingModule {}
