import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateProductSchema,
  PaginationQuerySchema,
  type CreateProductInput,
  type PaginationQuery,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { CreateProductUseCase } from '../application/use-cases/create-product.usecase';
import { ListProductsUseCase } from '../application/use-cases/list-products.usecase';

/**
 * Catalogue borné à une boutique. Le shopId vient du chemin pour l'instant ;
 * un middleware de résolution du tenant (sous-domaine / domaine perso / en-tête
 * signé) le fournira automatiquement à l'incrément dédié au multi-tenant.
 */
@ApiTags('catalog')
@Controller('shops/:shopId/products')
export class CatalogController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
  ) {}

  @Post()
  async create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(CreateProductSchema)) body: CreateProductInput,
  ) {
    const result = await this.createProduct.execute(shopId, body);
    if (result.isErr) {
      throw new UnprocessableEntityException(result.getError());
    }
    return result.unwrap();
  }

  @Get()
  async list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.listProducts.execute(shopId, query);
  }
}
