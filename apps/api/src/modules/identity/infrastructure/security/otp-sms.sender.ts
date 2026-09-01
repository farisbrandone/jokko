import { Logger } from '@nestjs/common';
import type { OtpSmsSender } from '../../domain/ports';

export interface OtpTermiiConfig {
  apiKey: string;
  senderId: string;
  baseUrl: string;
}

/** Envoi du code OTP par SMS via Termii. */
export class TermiiOtpSmsSender implements OtpSmsSender {
  private readonly logger = new Logger('OtpSmsSender(termii)');

  constructor(private readonly cfg: OtpTermiiConfig) {}

  async send(phone: string, code: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/api/sms/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          api_key: this.cfg.apiKey,
          to: phone.replace(/[^\d]/g, ''),
          from: this.cfg.senderId,
          sms: `Jokko : votre code de connexion est ${code}. Il expire dans 5 minutes.`,
          type: 'plain',
          channel: 'generic',
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Termii OTP → ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Termii injoignable : ${(err as Error).message}`);
      return false;
    }
  }
}

/** Adaptateur par défaut (dev / CI) : journalise le code. */
export class LogOtpSmsSender implements OtpSmsSender {
  private readonly logger = new Logger('OtpSmsSender(log)');

  send(phone: string, code: string): Promise<boolean> {
    this.logger.log(`OTP ${phone} → ${code}`);
    return Promise.resolve(true);
  }
}
