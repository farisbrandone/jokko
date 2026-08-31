import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import type { OutboxEnvelope } from '../../catalog/infrastructure/outbox/outbox.relay';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../identity/domain/ports';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../../shop/domain/ports/shop.repository';
import { Mailer } from '../infrastructure/mailer';

/**
 * Prévient les membres d'une boutique par e-mail quand un acheteur écrit.
 * Déclenché par l'Outbox → EventEmitter2. Les erreurs sont avalées : la
 * notification est « au mieux », l'événement Outbox reste marqué traité.
 */
@Injectable()
export class NewMessageListener {
  private readonly logger = new Logger(NewMessageListener.name);
  private readonly dashboardUrl: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly mailer: Mailer,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {
    this.dashboardUrl = config.get('notifications', { infer: true }).dashboardUrl;
  }

  @OnEvent('messaging.message.sent')
  async onMessage(envelope: OutboxEnvelope): Promise<void> {
    try {
      const p = envelope.payload as {
        sender: string;
        conversationId: string;
        preview: string;
        buyerName: string;
        productName: string | null;
      };
      if (p.sender !== 'buyer' || !envelope.shopId) return;

      const [shop, members] = await Promise.all([
        this.shops.findById(envelope.shopId),
        this.memberships.listMembers(envelope.shopId),
      ]);
      const recipients = members.map((m) => m.email).filter(Boolean);
      if (recipients.length === 0) return;

      const shopName = shop?.toSnapshot().name ?? 'votre boutique';
      const link = `${this.dashboardUrl}/s/${envelope.shopId}/inbox/${p.conversationId}`;
      const about = p.productName ? ` à propos de « ${p.productName} »` : '';

      await this.mailer.send({
        to: recipients,
        subject: `Nouveau message de ${p.buyerName}${about ? ' —' + about : ''}`,
        text: [
          `${p.buyerName} vous a écrit sur ${shopName}${about} :`,
          '',
          `« ${p.preview} »`,
          '',
          `Répondre : ${link}`,
        ].join('\n'),
        html: `<p><strong>${escapeHtml(p.buyerName)}</strong> vous a écrit sur ${escapeHtml(
          shopName,
        )}${escapeHtml(about)} :</p><blockquote>${escapeHtml(p.preview)}</blockquote><p><a href="${link}">Répondre dans la boîte de réception</a></p>`,
      });
      this.logger.log(`notification e-mail → ${recipients.length} membre(s) (conv ${p.conversationId})`);
    } catch (err) {
      this.logger.error(`échec de la notification: ${(err as Error).message}`);
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
