import { Module, type Provider } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AdminDbModule } from '../../shared/admin-db/admin-db.module';
import { ShopController } from './presentation/shop.controller';
import { InternalTlsController } from './presentation/internal-tls.controller';
import { CustomDomainController } from './presentation/custom-domain.controller';
import { DirectoryController } from './presentation/directory.controller';
import { ShopVerificationController } from './presentation/shop-verification.controller';
import { CreateShopUseCase } from './application/use-cases/create-shop.usecase';
import { GetShopUseCase } from './application/use-cases/get-shop.usecase';
import { UpdateShopUseCase } from './application/use-cases/update-shop.usecase';
import { CustomDomainService } from './application/custom-domain.service';
import { DirectoryService } from './application/directory.service';
import { ShopVerificationService } from './application/shop-verification.service';
import { SHOP_REPOSITORY } from './domain/ports/shop.repository';
import { DNS_VERIFIER } from './domain/ports/dns-verifier';
import { MikroOrmShopRepository } from './infrastructure/persistence/mikro-orm-shop.repository';
import { NodeDnsVerifier, StubDnsVerifier } from './infrastructure/dns/dns-verifier';
import { TenantResolver } from './tenant/tenant-resolver';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { TenantGuard } from './tenant/tenant.guard';

const dnsVerifierProvider: Provider = {
  provide: DNS_VERIFIER,
  useFactory: () =>
    process.env.DNS_STUB_ENABLED === '1' ? new StubDnsVerifier() : new NodeDnsVerifier(),
};

@Module({
  imports: [IdentityModule, AdminDbModule],
  controllers: [
    ShopController,
    InternalTlsController,
    CustomDomainController,
    DirectoryController,
    ShopVerificationController,
  ],
  providers: [
    CreateShopUseCase,
    GetShopUseCase,
    UpdateShopUseCase,
    CustomDomainService,
    DirectoryService,
    ShopVerificationService,
    TenantResolver,
    TenantMiddleware,
    TenantGuard,
    dnsVerifierProvider,
    { provide: SHOP_REPOSITORY, useClass: MikroOrmShopRepository },
  ],
  exports: [SHOP_REPOSITORY, TenantResolver, TenantMiddleware, TenantGuard],
})
export class ShopModule {}
