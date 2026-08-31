import { Module, type OnModuleInit } from '@nestjs/common';
import { ShopModule } from '../shop/shop.module';
import { meiliProvider } from './infrastructure/meili.provider';
import { ProductIndex } from './infrastructure/product-index';
import { SearchProductsUseCase } from './application/search-products.usecase';
import { CatalogIndexListener } from './listeners/catalog-index.listener';
import { SearchController } from './presentation/search.controller';

@Module({
  imports: [ShopModule],
  controllers: [SearchController],
  providers: [meiliProvider, ProductIndex, SearchProductsUseCase, CatalogIndexListener],
  exports: [ProductIndex],
})
export class SearchModule implements OnModuleInit {
  constructor(private readonly index: ProductIndex) {}

  async onModuleInit(): Promise<void> {
    await this.index.ensureConfigured();
  }
}
