import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityModule } from '../identity/identity.module';
import { BuyerAuthService } from './application/buyer-auth.service';
import { BuyerProfileService } from './application/buyer-profile.service';
import { BuyerOrdersService } from './application/buyer-orders.service';
import { BUYER_REPOSITORY } from './domain/ports';
import { BuyerEntity } from './infrastructure/persistence/buyer.entity';
import { MikroOrmBuyerRepository } from './infrastructure/persistence/mikro-orm-buyer.repository';
import { BuyerGuard } from './guards/buyer.guard';
import { BuyerAuthController } from './presentation/buyer-auth.controller';
import { BuyerController } from './presentation/buyer.controller';

@Module({
  imports: [MikroOrmModule.forFeature([BuyerEntity]), IdentityModule],
  controllers: [BuyerAuthController, BuyerController],
  providers: [
    BuyerAuthService,
    BuyerProfileService,
    BuyerOrdersService,
    BuyerGuard,
    { provide: BUYER_REPOSITORY, useClass: MikroOrmBuyerRepository },
  ],
})
export class BuyersModule {}
