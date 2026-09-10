import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PreviewDiscountSchema, type PreviewDiscountInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { DiscountsService } from '../application/discounts.service';

/** Vérification d'un code de réduction au panier (acheteur, non authentifié). */
@ApiTags('discounts')
@Controller('shops/:shopId/discounts')
@UseGuards(TenantGuard)
export class DiscountsPublicController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly discounts: DiscountsService,
  ) {}

  @Post('preview')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  preview(
    @Body(new ZodValidationPipe(PreviewDiscountSchema)) body: PreviewDiscountInput,
  ) {
    return this.discounts.preview(this.tenant.getShopId(), body.code, body.subtotal);
  }
}
