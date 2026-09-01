import { Logger } from '@nestjs/common';
import type { SmsSender, WhatsAppSender } from '../domain/ports';

export interface TermiiConfig {
  apiKey: string;
  senderId: string;
  baseUrl: string;
}

/**
 * Client Termii minimal (SMS + WhatsApp via l'endpoint `/api/sms/send`, en
 * faisant varier le `channel`). Marché pilote : Sénégal + Côte d'Ivoire (XOF).
 * Les numéros doivent être au format E.164 sans « + » (ex. 221771234567).
 */
class TermiiClient {
  private readonly logger = new Logger('Termii');

  constructor(private readonly cfg: TermiiConfig) {}

  async sendSms(to: string, text: string, channel: 'generic' | 'whatsapp'): Promise<boolean> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/api/sms/send`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          api_key: this.cfg.apiKey,
          to: to.replace(/[^\d]/g, ''),
          from: this.cfg.senderId,
          sms: text,
          type: 'plain',
          channel,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Termii ${channel} → ${res.status} ${(await res.text()).slice(0, 200)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Termii ${channel} injoignable : ${(err as Error).message}`);
      return false;
    }
  }
}

export class TermiiSmsSender implements SmsSender {
  private readonly client: TermiiClient;
  constructor(cfg: TermiiConfig) {
    this.client = new TermiiClient(cfg);
  }
  send(to: string, text: string): Promise<boolean> {
    return this.client.sendSms(to, text, 'generic');
  }
}

export class TermiiWhatsAppSender implements WhatsAppSender {
  private readonly client: TermiiClient;
  constructor(cfg: TermiiConfig) {
    this.client = new TermiiClient(cfg);
  }
  send(to: string, text: string): Promise<boolean> {
    return this.client.sendSms(to, text, 'whatsapp');
  }
}
