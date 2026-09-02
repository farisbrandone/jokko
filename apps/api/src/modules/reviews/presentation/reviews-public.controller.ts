import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createReviewSchema, type CreateReviewInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { ReviewsService } from '../application/reviews.service';

/** Avis produits — lecture publique + dépôt par l'acheteur (modéré ensuite). */
@ApiTags('reviews')
@Controller('shops/:shopId/products/:productId/reviews')
@UseGuards(TenantGuard)
export class ReviewsPublicController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly reviews: ReviewsService,
  ) {}

  @Get()
  list(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviews.publicForProduct(this.tenant.getShopId(), productId);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) body: CreateReviewInput,
  ) {
    return this.reviews.submit(this.tenant.getShopId(), productId, body);
  }
}
