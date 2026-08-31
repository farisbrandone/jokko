import { Module } from '@nestjs/common';
import { CatalogController } from './presentation/catalog.controller';
import { CreateProductUseCase } from './application/use-cases/create-product.usecase';
import { ListProductsUseCase } from './application/use-cases/list-products.usecase';
import { PRODUCT_REPOSITORY } from './domain/ports/product.repository';
import { InMemoryProductRepository } from './infrastructure/persistence/in-memory-product.repository';

@Module({
  controllers: [CatalogController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: InMemoryProductRepository },
  ],
})
export class CatalogModule {}
