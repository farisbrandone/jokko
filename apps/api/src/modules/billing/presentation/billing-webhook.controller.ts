import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import { ApplyPaymentUseCase } from '../application/apply-payment.usecase';

interface FlutterwaveEvent {
  data?: { tx_ref?: string; txRef?: string };
}

/** Webhook Flutterwave (public, signé par l'en-tête `verif-hash`). */
@ApiExcludeController()
@Controller('billing/webhook')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);
  private readonly webhookSecret: string | null;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly applyPayment: ApplyPaymentUseCase,
  ) {
    this.webhookSecret = config.get('billing', { infer: true }).flutterwave?.webhookSecret ?? null;
  }

  @Post('flutterwave')
  @HttpCode(200)
  async flutterwave(
    @Headers('verif-hash') signature: string | undefined,
    @Body() body: FlutterwaveEvent,
  ) {
    if (this.webhookSecret && signature !== this.webhookSecret) {
      this.logger.warn('webhook Flutterwave: signature invalide');
      return { status: 'rejected' };
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
