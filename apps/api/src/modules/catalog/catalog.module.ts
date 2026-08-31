import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { CatalogController } from './presentation/catalog.controller';
import { CreateProductUseCase } from './application/use-cases/create-product.usecase';
import { ListProductsUseCase } from './application/use-cases/list-products.usecase';
import { PublishProductUseCase } from './application/use-cases/publish-product.usecase';
import { UpdateProductUseCase } from './application/use-cases/update-product.usecase';
import { GetProductUseCase } from './application/use-cases/get-product.usecase';
import { PRODUCT_REPOSITORY } from './domain/ports/product.repository';
import { ProductEntity } from './infrastructure/persistence/product.entity';
import { MikroOrmProductRepository } from './infrastructure/persistence/mikro-orm-product.repository';
import { OutboxMessageEntity } from '../../persistence/entities/outbox-message.entity';
import { OutboxRelay } from './infrastructure/outbox/outbox.relay';

@Module({
  imports: [
    MikroOrmModule.forFeature([ProductEntity, OutboxMessageEntity]),
    IdentityModule,
    ShopModule,
  ],
  controllers: [CatalogController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    PublishProductUseCase,
    UpdateProductUseCase,
    GetProductUseCase,
    OutboxRelay,
    { provide: PRODUCT_REPOSITORY, useClass: MikroOrmProductRepository },
  ],
})
export class CatalogModule {}
