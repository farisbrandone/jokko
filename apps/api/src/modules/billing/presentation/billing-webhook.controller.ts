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
import { ApplyPaymentUseCase } from '../application/apply-payment.usecase';

interface FlutterwaveEvent {
  data?: { tx_ref?: string; txRef?: string };
}

/** Comparaison à temps constant de deux secrets encodés en UTF-8. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Webhook Flutterwave (public, signé par l'en-tête `verif-hash`). */
@ApiExcludeController()
@SkipThrottle()
@Controller('billing/webhook')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);
  private readonly webhookSecret: string | null;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly applyPayment: ApplyPaymentUseCase,
  ) {
    this.webhookSecret = config.get('billing', { infer: true }).webhookSecret;
  }

  @Post('flutterwave')
  @HttpCode(200)
  async flutterwave(
    @Headers('verif-hash') signature: string | undefined,
    @Body() body: FlutterwaveEvent,
  ) {
    // Sans secret configuré (mode « fake », dev), aucun webhook n'est légitime :
    // la vérification de paiement renverrait toujours « succès ».
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('webhook de facturation non configuré');
    }
    if (!signature || !safeEqual(signature, this.webhookSecret)) {
      this.logger.warn('webhook Flutterwave: signature invalide');
      throw new ForbiddenException('signature invalide');
    }
    const txRef = body?.data?.tx_ref ?? body?.data?.txRef;
    if (!txRef) return { status: 'ignored' };
    try {
      const outcome = await this.applyPayment.execute(txRef);
      return { status: outcome };
    } catch (err) {
      this.logger.error(`webhook Flutterwave: ${(err as Error).message}`);
      return { status: 'error' };
    }
  }
}
