import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../../../config/configuration';

interface WhatsAppInboundValue {
  messages?: {
    from?: string;
    id?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  }[];
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
}

interface WhatsAppWebhookBody {
  entry?: { changes?: { value?: WhatsAppInboundValue }[] }[];
}

/**
 * Webhook entrant WhatsApp Cloud API (Meta).
 *
 * Entièrement optionnel : sans `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, la vérification
 * GET échoue simplement (403) et l'app fonctionne normalement. Le POST est
 * pour l'instant en journalisation seule — le routage multi-boutique d'un
 * numéro WhatsApp partagé vers la bonne conversation reste à faire.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  private readonly verifyToken: string | null;
  private readonly appSecret: string | null;

  constructor(config: ConfigService<AppConfig, true>) {
    const w = config.get('notifications', { infer: true }).whatsappWebhook;
    this.verifyToken = w.verifyToken;
    this.appSecret = w.appSecret;
  }

  /** Handshake de vérification Meta : renvoie `hub.challenge` si le token correspond. */
  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): string {
    if (
      mode === 'subscribe' &&
      this.verifyToken &&
      token &&
      safeEqual(token, this.verifyToken)
    ) {
      return challenge ?? '';
    }
    throw new ForbiddenException('verify token invalide');
  }

  /** Réception des messages/statuts. Toujours 200 pour éviter les relances Meta. */
  @Post()
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<FastifyRequest>): { status: string } {
    if (this.appSecret) {
      const sig = req.headers['x-hub-signature-256'];
      const raw = req.rawBody;
      if (typeof sig !== 'string' || !raw || !this.validSignature(raw, sig)) {
        throw new ForbiddenException('signature invalide');
      }
    }

    const body = (req.body ?? {}) as WhatsAppWebhookBody;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          this.logger.log(
            `message entrant de ${msg.from ?? '?'} (${msg.type ?? '?'}) : ` +
              `${msg.text?.body?.slice(0, 200) ?? ''}`,
          );
        }
      }
    }
    return { status: 'received' };
  }

  private validSignature(raw: Buffer, header: string): boolean {
    const expected =
      'sha256=' + createHmac('sha256', this.appSecret!).update(raw).digest('hex');
    return safeEqual(header, expected);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
