import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CatalogController } from './presentation/catalog.controller';
import { CreateProductUseCase } from './application/use-cases/create-product.usecase';
import { ListProductsUseCase } from './application/use-cases/list-products.usecase';
import { PRODUCT_REPOSITORY } from './domain/ports/product.repository';
import { ProductEntity } from './infrastructure/persistence/product.entity';
import { MikroOrmProductRepository } from './infrastructure/persistence/mikro-orm-product.repository';
import { OutboxMessageEntity } from '../../persistence/entities/outbox-message.entity';
import { OutboxRelay } from './infrastructure/outbox/outbox.relay';

@Module({
  imports: [MikroOrmModule.forFeature([ProductEntity, OutboxMessageEntity])],
  controllers: [CatalogController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    OutboxRelay,
    { provide: PRODUCT_REPOSITORY, useClass: MikroOrmProductRepository },
  ],
})
export class CatalogModule {}
