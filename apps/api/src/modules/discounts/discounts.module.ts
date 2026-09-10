import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { DiscountsService } from './application/discounts.service';
import { DISCOUNT_CODE_REPOSITORY } from './domain/ports';
import { DiscountCodeEntity } from './infrastructure/persistence/discount-code.entity';
import { MikroOrmDiscountCodeRepository } from './infrastructure/persistence/mikro-orm-discount-code.repository';
import { DiscountsAdminController } from './presentation/discounts-admin.controller';
import { DiscountsPublicController } from './presentation/discounts-public.controller';

@Module({
  imports: [MikroOrmModule.forFeature([DiscountCodeEntity]), IdentityModule, ShopModule],
  controllers: [DiscountsAdminController, DiscountsPublicController],
  providers: [
    DiscountsService,
    { provide: DISCOUNT_CODE_REPOSITORY, useClass: MikroOrmDiscountCodeRepository },
  ],
  exports: [DISCOUNT_CODE_REPOSITORY],
})
export class DiscountsModule {}
