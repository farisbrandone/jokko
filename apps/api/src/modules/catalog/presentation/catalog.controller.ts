import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateProductSchema,
  PaginationQuerySchema,
  UpdateProductSchema,
  type CreateProductInput,
  type PaginationQuery,
  type UpdateProductInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { CreateProductUseCase } from '../application/use-cases/create-product.usecase';
import { ListProductsUseCase } from '../application/use-cases/list-products.usecase';
import { PublishProductUseCase } from '../application/use-cases/publish-product.usecase';
import { UpdateProductUseCase } from '../application/use-cases/update-product.usecase';
import { GetProductUseCase } from '../application/use-cases/get-product.usecase';

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
    private readonly publishProduct: PublishProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly getProduct: GetProductUseCase,
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

  @Patch(':productId')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('update', 'Product'))
  async update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) body: UpdateProductInput,
  ) {
    const result = await this.updateProduct.execute(
      this.tenant.getShopId(),
      productId,
      body,
    );
    if (result.isErr) throw new UnprocessableEntityException(result.getError());
    return result.unwrap();
  }

  @Post(':productId/publish')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('update', 'Product'))
  async publish(@Param('productId', ParseUUIDPipe) productId: string) {
    const result = await this.publishProduct.execute(this.tenant.getShopId(), productId);
    if (result.isErr) throw new UnprocessableEntityException(result.getError());
    return result.unwrap();
  }

  @Post(':productId/unpublish')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('update', 'Product'))
  async unpublish(@Param('productId', ParseUUIDPipe) productId: string) {
    const result = await this.publishProduct.unpublish(this.tenant.getShopId(), productId);
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

  /** Fiche produit — membres : quel que soit le statut (édition). */
  @Get(':productId/edit')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('read', 'Product'))
  async editView(@Param('productId', ParseUUIDPipe) productId: string) {
    const product = await this.getProduct.anyByIdOrSlug(this.tenant.getShopId(), productId);
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  /** Fiche produit publique — par id ou slug, publiée uniquement. */
  @Get(':idOrSlug')
  @UseGuards(TenantGuard)
  async detail(@Param('idOrSlug') idOrSlug: string) {
    const product = await this.getProduct.publicByIdOrSlug(this.tenant.getShopId(), idOrSlug);
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }
}
