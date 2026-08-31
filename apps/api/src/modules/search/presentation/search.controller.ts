import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ProductSearchQuerySchema,
  type ProductSearchQuery,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { SearchProductsUseCase } from '../application/search-products.usecase';

/** Recherche à facettes, publique, strictement bornée à la boutique courante. */
@ApiTags('search')
@Controller('shops/:shopId/search')
export class SearchController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly search: SearchProductsUseCase,
  ) {}

  @Get()
  @UseGuards(TenantGuard)
  run(@Query(new ZodValidationPipe(ProductSearchQuerySchema)) query: ProductSearchQuery) {
    return this.search.execute(this.tenant.getShopId(), query);
  }
}
