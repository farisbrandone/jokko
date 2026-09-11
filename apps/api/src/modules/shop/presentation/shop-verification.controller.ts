import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubmitShopVerificationSchema, type SubmitShopVerificationInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { ShopVerificationService } from '../application/shop-verification.service';

/** Demande de badge « boutique vérifiée » — privé, réservé aux membres de la boutique. */
@ApiTags('shop')
@Controller('shops/:shopId/verification')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class ShopVerificationController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly verification: ShopVerificationService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  get() {
    return this.verification.get(this.tenant.getShopId());
  }

  @Post()
  @CheckPolicies((a) => a.can('update', 'Shop'))
  submit(
    @Body(new ZodValidationPipe(SubmitShopVerificationSchema)) body: SubmitShopVerificationInput,
  ) {
    return this.verification.submit(this.tenant.getShopId(), body);
  }
}
