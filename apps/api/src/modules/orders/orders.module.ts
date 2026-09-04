import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { CatalogModule } from '../catalog/catalog.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrderEntity } from './infrastructure/persistence/order.entity';
import { MikroOrmOrderRepository } from './infrastructure/persistence/mikro-orm-order.repository';
import { ORDER_REPOSITORY } from './domain/ports';
import { PlaceOrderUseCase } from './application/place-order.usecase';
import { ApplyOrderPaymentUseCase } from './application/apply-order-payment.usecase';
import { OrdersService } from './application/orders.service';
import { OrdersController } from './presentation/orders.controller';
import { OrdersWebhookController } from './presentation/orders-webhook.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([OrderEntity]),
    IdentityModule,
    ShopModule,
    CatalogModule,
    BillingModule,
    NotificationsModule,
  ],
  controllers: [OrdersController, OrdersWebhookController],
  providers: [
    PlaceOrderUseCase,
    ApplyOrderPaymentUseCase,
    OrdersService,
    { provide: ORDER_REPOSITORY, useClass: MikroOrmOrderRepository },
  ],
})
export class OrdersModule {}
