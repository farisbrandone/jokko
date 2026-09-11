import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { OrdersModule } from '../orders/orders.module';
import { BuyersModule } from '../buyers/buyers.module';
import { DisputeService } from './application/dispute.service';
import { DISPUTE_REPOSITORY } from './domain/ports';
import { DisputeEntity } from './infrastructure/persistence/dispute.entity';
import { MikroOrmDisputeRepository } from './infrastructure/persistence/mikro-orm-dispute.repository';
import { SellerDisputesController } from './presentation/seller-disputes.controller';
import { BuyerDisputesController } from './presentation/buyer-disputes.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([DisputeEntity]),
    IdentityModule,
    ShopModule,
    OrdersModule,
    BuyersModule,
  ],
  controllers: [SellerDisputesController, BuyerDisputesController],
  providers: [
    DisputeService,
    { provide: DISPUTE_REPOSITORY, useClass: MikroOrmDisputeRepository },
  ],
})
export class DisputesModule {}
