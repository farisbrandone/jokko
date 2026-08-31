import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateProductSchema,
  PaginationQuerySchema,
  type CreateProductInput,
  type PaginationQuery,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { CreateProductUseCase } from '../application/use-cases/create-product.usecase';
import { ListProductsUseCase } from '../application/use-cases/list-products.usecase';

/**
 * Catalogue borné à la boutique courante (résolue par TenantMiddleware :
 * sous-domaine / domaine perso / en-tête signé / repli `/shops/:id`).
 * Lecture publique ; écriture réservée aux membres autorisés.
 */
@ApiTags('catalog')
@Controller('shops/:shopId/products')
export class CatalogController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
  ) {}

  @Post()
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'Product'))
  async create(
    @Body(new ZodValidationPipe(CreateProductSchema)) body: CreateProductInput,
  ) {
    const result = await this.createProduct.execute(this.tenant.getShopId(), body);
    if (result.isErr) throw new UnprocessableEntityException(result.getError());
    return result.unwrap();
  }

  @Get()
  @UseGuards(TenantGuard)
  async list(
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.listProducts.execute(this.tenant.getShopId(), query);
  }
}
