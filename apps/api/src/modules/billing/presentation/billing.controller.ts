import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { checkoutInputSchema, type CheckoutInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { ApplyPaymentUseCase } from '../application/apply-payment.usecase';
import { BillingService } from '../application/billing.service';

const ConfirmSchema = z.object({ txRef: z.string().min(6).max(80) });

/** Abonnement de la boutique (membre autorisé). */
@ApiTags('billing')
@Controller('shops/:shopId/billing')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class BillingController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly billing: BillingService,
    private readonly applyPayment: ApplyPaymentUseCase,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  summary() {
    return this.billing.summary(this.tenant.getShopId());
  }

  @Post('checkout')
  @CheckPolicies((a) => a.can('update', 'Shop'))
  checkout(
    @CurrentUser() user: { email: string },
    @Body(new ZodValidationPipe(checkoutInputSchema)) body: CheckoutInput,
  ) {
    return this.billing.checkout(this.tenant.getShopId(), user.email, body.returnUrl);
  }

  /** Confirmation au retour du paiement (complète le webhook, utile en local). */
  @Post('confirm')
  @CheckPolicies((a) => a.can('update', 'Shop'))
  async confirm(@Body(new ZodValidationPipe(ConfirmSchema)) body: { txRef: string }) {
    const outcome = await this.applyPayment.execute(body.txRef, this.tenant.getShopId());
    return { outcome };
  }
}
