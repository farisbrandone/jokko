import { Logger } from '@nestjs/common';
import type { WhatsAppSender } from '../domain/ports';

export interface WhatsAppCloudConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
}

/**
 * WhatsApp Cloud API (Meta / Graph API). Envoie un message texte à un numéro
 * E.164. Toute erreur est journalisée et renvoie `false` : jamais bloquant.
 *
 * Remarque : hors fenêtre de service client de 24 h, Meta n'autorise que les
 * modèles pré-approuvés. Ici on envoie du texte libre — adapté aux réponses
 * dans une conversation active ; pour des notifications proactives à froid,
 * il faudra basculer sur `type: 'template'`.
 */
export class MetaCloudWhatsAppSender implements WhatsAppSender {
  private readonly logger = new Logger('WhatsAppSender(cloud)');
  private readonly url: string;

  constructor(private readonly cfg: WhatsAppCloudConfig) {
    this.url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  }

  async send(to: string, text: string): Promise<boolean> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.cfg.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^\d]/g, ''),
          type: 'text',
          text: { body: text.slice(0, 4096) },
        }),
      });
      if (!res.ok) {
        this.logger.warn(
          `Cloud API → ${res.status} ${(await res.text()).slice(0, 300)}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Cloud API injoignable : ${(err as Error).message}`);
      return false;
    }
  }
}
