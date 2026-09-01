import { Logger } from '@nestjs/common';
import webpush from 'web-push';
import type { PushPayload, PushSender, PushSubscriptionData } from '../domain/ports';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Envoi Web Push chiffré (VAPID). Purge les abonnements expirés (404/410). */
export class WebPushSender implements PushSender {
  private readonly logger = new Logger('WebPushSender');
  readonly publicKey: string;

  constructor(cfg: VapidConfig) {
    this.publicKey = cfg.publicKey;
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  }

  async send(
    sub: PushSubscriptionData,
    payload: PushPayload,
    onGone: (endpoint: string) => void,
  ): Promise<boolean> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 600, urgency: 'high' },
      );
      return true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        onGone(sub.endpoint);
        return false;
      }
      this.logger.warn(`push non distribué (${status ?? 'err'}): ${(err as Error).message}`);
      return false;
    }
  }
}

/** Adaptateur par défaut (sans clés VAPID) : journalise, ne distribue rien. */
export class LogPushSender implements PushSender {
  private readonly logger = new Logger('PushSender(log)');
  readonly publicKey = null;

  send(sub: PushSubscriptionData, payload: PushPayload): Promise<boolean> {
    this.logger.log(`push → ${sub.endpoint.slice(0, 48)}… : ${payload.title}`);
    return Promise.resolve(false);
  }
}
