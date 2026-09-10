import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateDiscountCodeSchema,
  UpdateDiscountCodeSchema,
  type CreateDiscountCodeInput,
  type UpdateDiscountCodeInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { DiscountsService } from '../application/discounts.service';

/** Codes de réduction — gestion par un membre autorisé de la boutique. */
@ApiTags('discounts')
@Controller('shops/:shopId/discounts')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class DiscountsAdminController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly discounts: DiscountsService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  list() {
    return this.discounts.list(this.tenant.getShopId());
  }

  @Post()
  @CheckPolicies((a) => a.can('update', 'Shop'))
  create(
    @Body(new ZodValidationPipe(CreateDiscountCodeSchema)) body: CreateDiscountCodeInput,
  ) {
    return this.discounts.create(this.tenant.getShopId(), body);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Shop'))
  toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateDiscountCodeSchema)) body: UpdateDiscountCodeInput,
  ) {
    return this.discounts.setActive(this.tenant.getShopId(), id, body.active);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('update', 'Shop'))
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.discounts.remove(this.tenant.getShopId(), id);
  }
}
