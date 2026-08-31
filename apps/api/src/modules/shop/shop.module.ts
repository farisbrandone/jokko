import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ShopController } from './presentation/shop.controller';
import { InternalTlsController } from './presentation/internal-tls.controller';
import { CreateShopUseCase } from './application/use-cases/create-shop.usecase';
import { GetShopUseCase } from './application/use-cases/get-shop.usecase';
import { SHOP_REPOSITORY } from './domain/ports/shop.repository';
import { MikroOrmShopRepository } from './infrastructure/persistence/mikro-orm-shop.repository';
import { TenantResolver } from './tenant/tenant-resolver';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { TenantGuard } from './tenant/tenant.guard';

@Module({
  imports: [IdentityModule],
  controllers: [ShopController, InternalTlsController],
  providers: [
    CreateShopUseCase,
    GetShopUseCase,
    TenantResolver,
    TenantMiddleware,
    TenantGuard,
    { provide: SHOP_REPOSITORY, useClass: MikroOrmShopRepository },
  ],
  exports: [SHOP_REPOSITORY, TenantResolver, TenantMiddleware, TenantGuard],
})
export class ShopModule {}
