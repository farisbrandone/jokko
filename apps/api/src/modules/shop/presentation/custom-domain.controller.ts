import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { customDomainInputSchema, type CustomDomainInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { CustomDomainService } from '../application/custom-domain.service';

/** Domaine personnalisé d'une boutique (membre autorisé). */
@ApiTags('shop')
@Controller('shops/:shopId/domain')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class CustomDomainController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly domain: CustomDomainService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  status() {
    return this.domain.status(this.tenant.getShopId());
  }

  @Post()
  @HttpCode(200)
  @CheckPolicies((a) => a.can('update', 'Shop'))
  request(
    @Body(new ZodValidationPipe(customDomainInputSchema)) body: CustomDomainInput,
  ) {
    return this.domain.request(this.tenant.getShopId(), body.domain);
  }

  @Post('verify')
  @CheckPolicies((a) => a.can('update', 'Shop'))
  verify() {
    return this.domain.verify(this.tenant.getShopId());
  }

  @Delete()
  @HttpCode(200)
  @CheckPolicies((a) => a.can('update', 'Shop'))
  async clear() {
    await this.domain.clear(this.tenant.getShopId());
    return { cleared: true };
  }
}
