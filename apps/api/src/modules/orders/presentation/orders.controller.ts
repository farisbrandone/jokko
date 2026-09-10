import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  ConfirmOrderSchema,
  CreateOrderSchema,
  type ConfirmOrderInput,
  type CreateOrderInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { PlaceOrderUseCase } from '../application/place-order.usecase';
import { OrdersService } from '../application/orders.service';

const ListQuery = z.object({
  status: z
    .enum(['pending_payment', 'to_deliver', 'paid', 'fulfilled', 'canceled'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});
const TokenQuery = z.object({ token: z.string().min(10).max(200) });

@ApiTags('orders')
@Controller('shops/:shopId/orders')
export class OrdersController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly place: PlaceOrderUseCase,
    private readonly orders: OrdersService,
  ) {}

  // ── Acheteur (public, borné par la boutique du chemin) ────────────────────
  @Post()
  @UseGuards(TenantGuard)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  create(@Body(new ZodValidationPipe(CreateOrderSchema)) body: CreateOrderInput) {
    return this.place.execute(this.tenant.getShopId(), body);
  }

  @Post(':orderId/confirm')
  @UseGuards(TenantGuard)
  confirm(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body(new ZodValidationPipe(ConfirmOrderSchema)) body: ConfirmOrderInput,
  ) {
    return this.orders.confirmByBuyer(
      this.tenant.getShopId(),
      orderId,
      body.token,
      body.txRef,
    );
  }

  @Get(':orderId/track')
  @UseGuards(TenantGuard)
  track(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query(new ZodValidationPipe(TokenQuery)) query: { token: string },
  ) {
    return this.orders.getForBuyer(this.tenant.getShopId(), orderId, query.token);
  }

  // ── Vendeur (membre autorisé) ────────────────────────────────────────────
  @Get()
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('read', 'Order'))
  list(@Query(new ZodValidationPipe(ListQuery)) query: { status?: string; page: number }) {
    return this.orders.listForShop(this.tenant.getShopId(), query);
  }

  @Get(':orderId')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('read', 'Order'))
  detail(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.orders.getForShop(this.tenant.getShopId(), orderId);
  }

  @Post(':orderId/fulfill')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('manage', 'Order'))
  fulfill(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.orders.fulfill(this.tenant.getShopId(), orderId);
  }

  @Post(':orderId/cancel')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('manage', 'Order'))
  cancel(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.orders.cancel(this.tenant.getShopId(), orderId);
  }
}
