import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateBuyerSchema, type UpdateBuyerInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { BuyerGuard } from '../guards/buyer.guard';
import { CurrentBuyer } from '../decorators/current-buyer.decorator';
import type { AuthenticatedBuyer } from '../guards/buyer.guard';
import { BuyerProfileService } from '../application/buyer-profile.service';
import { BuyerOrdersService } from '../application/buyer-orders.service';

/** Profil et historique de commandes de l'acheteur connecté. */
@ApiTags('buyer')
@Controller('buyer')
@UseGuards(BuyerGuard)
export class BuyerController {
  constructor(
    private readonly profile: BuyerProfileService,
    private readonly orders: BuyerOrdersService,
  ) {}

  @Get('me')
  me(@CurrentBuyer() buyer: AuthenticatedBuyer) {
    return this.profile.get(buyer.id);
  }

  @Patch('me')
  update(
    @CurrentBuyer() buyer: AuthenticatedBuyer,
    @Body(new ZodValidationPipe(UpdateBuyerSchema)) body: UpdateBuyerInput,
  ) {
    return this.profile.update(buyer.id, body);
  }

  @Get('orders')
  listOrders(@CurrentBuyer() buyer: AuthenticatedBuyer) {
    return this.orders.listForBuyer(buyer.phone);
  }

  @Get('orders/:orderId')
  getOrder(
    @CurrentBuyer() buyer: AuthenticatedBuyer,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orders.getOne(buyer.phone, orderId);
  }
}
