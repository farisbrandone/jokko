import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { AppConfig } from '../../../config/configuration';

export interface OutgoingMail {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * Boîte d'envoi en mémoire — alimentée uniquement quand `NODE_ENV=test`.
 * Sert aux tests d'intégration à inspecter le contenu d'un e-mail.
 */
export const __testMailbox: OutgoingMail[] = [];

/** Envoi d'e-mails transactionnels via SMTP (dev : Mailpit ; prod : SES/Postmark…). */
@Injectable()
export class Mailer implements OnModuleDestroy {
  private readonly logger = new Logger(Mailer.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const n = config.get('notifications', { infer: true });
    this.from = n.from;
    // `SMTP_URL=json` : transport sans réseau (dev / CI) — les mails sont sérialisés
    // et considérés comme envoyés, sans serveur SMTP.
    this.transporter =
      n.smtpUrl === 'json' ? createTransport({ jsonTransport: true }) : createTransport(n.smtpUrl);
  }

  async send(mail: OutgoingMail): Promise<boolean> {
    try {
      await this.transporter.sendMail({ from: this.from, ...mail });
      if (process.env.NODE_ENV === 'test') __testMailbox.push(mail);
      return true;
    } catch (err) {
      this.logger.warn(`e-mail non envoyé (${mail.subject}) : ${(err as Error).message}`);
      return false;
    }
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}
