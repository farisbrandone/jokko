import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import { ApplyOrderPaymentUseCase } from '../application/apply-order-payment.usecase';

interface FlutterwaveEvent {
  data?: { tx_ref?: string; txRef?: string };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Webhook de paiement des commandes (partage le secret `verif-hash` de la facturation). */
@ApiExcludeController()
@SkipThrottle()
@Controller('orders/webhook')
export class OrdersWebhookController {
  private readonly logger = new Logger(OrdersWebhookController.name);
  private readonly secret: string | null;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly applyPayment: ApplyOrderPaymentUseCase,
  ) {
    this.secret = config.get('billing', { infer: true }).webhookSecret;
  }

  @Post('flutterwave')
  @HttpCode(200)
  async flutterwave(
    @Headers('verif-hash') signature: string | undefined,
    @Body() body: FlutterwaveEvent,
  ) {
    if (!this.secret) throw new ServiceUnavailableException('webhook non configuré');
    if (!signature || !safeEqual(signature, this.secret)) {
      throw new ForbiddenException('signature invalide');
    }
    const txRef = body?.data?.tx_ref ?? body?.data?.txRef;
    if (!txRef) return { status: 'ignored' };
    try {
      return { status: await this.applyPayment.execute(txRef) };
    } catch (err) {
      this.logger.error(`webhook commande: ${(err as Error).message}`);
      return { status: 'error' };
    }
  }
}
