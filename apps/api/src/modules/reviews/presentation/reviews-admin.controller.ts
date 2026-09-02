import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  moderateReviewSchema,
  reviewStatusSchema,
  type ModerateReviewInput,
  type ReviewStatus,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { ReviewsService } from '../application/reviews.service';

/** Modération des avis par un membre de la boutique. */
@ApiTags('reviews')
@Controller('shops/:shopId/reviews')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class ReviewsAdminController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly reviews: ReviewsService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Product'))
  list(@Query('status') status?: string) {
    const parsed = reviewStatusSchema.safeParse(status);
    return this.reviews.listForShop(
      this.tenant.getShopId(),
      parsed.success ? (parsed.data as ReviewStatus) : undefined,
    );
  }

  @Post(':id/moderate')
  @CheckPolicies((a) => a.can('manage', 'Product'))
  moderate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moderateReviewSchema)) body: ModerateReviewInput,
  ) {
    return this.reviews.moderate(this.tenant.getShopId(), id, body);
  }
}
