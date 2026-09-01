import { Injectable, Logger } from '@nestjs/common';
import type { SmsSender, WhatsAppSender } from '../domain/ports';

/** Adaptateur par défaut (dev / CI) : journalise au lieu d'envoyer. */
@Injectable()
export class LogSmsSender implements SmsSender {
  private readonly logger = new Logger('SmsSender(log)');

  send(to: string, text: string): Promise<boolean> {
    this.logger.log(`SMS → ${to} : ${text.slice(0, 120)}`);
    return Promise.resolve(true);
  }
}

@Injectable()
export class LogWhatsAppSender implements WhatsAppSender {
  private readonly logger = new Logger('WhatsAppSender(log)');

  send(to: string, text: string): Promise<boolean> {
    this.logger.log(`WhatsApp → ${to} : ${text.slice(0, 120)}`);
    return Promise.resolve(true);
  }
}
