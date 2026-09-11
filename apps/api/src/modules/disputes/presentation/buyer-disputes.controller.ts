import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  EscalateDisputeSchema,
  OpenDisputeSchema,
  type EscalateDisputeInput,
  type OpenDisputeInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { BuyerGuard, type AuthenticatedBuyer } from '../../buyers/guards/buyer.guard';
import { CurrentBuyer } from '../../buyers/decorators/current-buyer.decorator';
import { DisputeService } from '../application/dispute.service';

/** Litiges acheteur — ouverture sur l'une de ses commandes, escalade vers la plateforme. */
@ApiTags('disputes')
@Controller('buyer')
@UseGuards(BuyerGuard)
export class BuyerDisputesController {
  constructor(private readonly disputes: DisputeService) {}

  @Post('orders/:orderId/dispute')
  open(
    @CurrentBuyer() buyer: AuthenticatedBuyer,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body(new ZodValidationPipe(OpenDisputeSchema)) body: OpenDisputeInput,
  ) {
    return this.disputes.openForOrder(orderId, buyer.phone, body);
  }

  @Get('orders/:orderId/dispute')
  get(
    @CurrentBuyer() buyer: AuthenticatedBuyer,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.disputes.getForOrder(orderId, buyer.phone);
  }

  @Post('disputes/:id/escalate')
  escalate(
    @CurrentBuyer() buyer: AuthenticatedBuyer,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(EscalateDisputeSchema)) body: EscalateDisputeInput,
  ) {
    return this.disputes.escalate(id, buyer.phone, body.note);
  }
}
