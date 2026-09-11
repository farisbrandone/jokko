import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RespondDisputeSchema, type RespondDisputeInput, DisputeStatusSchema } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { DisputeService } from '../application/dispute.service';

const ListQuerySchema = z.object({ status: DisputeStatusSchema.optional() });
type ListQuery = z.infer<typeof ListQuerySchema>;

/** File des litiges de la boutique — réponse du vendeur. */
@ApiTags('disputes')
@Controller('shops/:shopId/disputes')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class SellerDisputesController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly disputes: DisputeService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  list(@Query(new ZodValidationPipe(ListQuerySchema)) q: ListQuery) {
    return this.disputes.listForShop(this.tenant.getShopId(), q.status);
  }

  @Post(':id/respond')
  @CheckPolicies((a) => a.can('update', 'Shop'))
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RespondDisputeSchema)) body: RespondDisputeInput,
  ) {
    return this.disputes.respond(this.tenant.getShopId(), id, body);
  }
}
