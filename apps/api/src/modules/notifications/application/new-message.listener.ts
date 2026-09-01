import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type { NotificationChannel } from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import type { OutboxEnvelope } from '../../catalog/infrastructure/outbox/outbox.relay';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../identity/domain/ports';
import { SHOP_REPOSITORY, type ShopRepository } from '../../shop/domain/ports/shop.repository';
import {
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSender,
  type PushSubscriptionRepository,
  type StoredPushSubscription,
} from '../../push/domain/ports';
import { selectChannels } from '../domain/channel-policy';
import {
  DISPATCH_LOG_REPOSITORY,
  NOTIFICATION_SETTINGS_REPOSITORY,
  SMS_SENDER,
  WHATSAPP_SENDER,
  type DispatchLogRepository,
  type NotificationSettingsRepository,
  type SmsSender,
  type WhatsAppSender,
} from '../domain/ports';
import { Mailer } from '../infrastructure/mailer';

interface MessagePayload {
  sender: string;
  conversationId: string;
  preview: string;
  buyerName: string;
  productName: string | null;
}

interface DispatchContext {
  recipients: string[];
  pushSubs: StoredPushSubscription[];
  phone: string | null;
  shopName: string;
  about: string;
  link: string;
  shortText: string;
  preview: string;
  buyerName: string;
}

/**
 * Prévient les membres d'une boutique quand un acheteur écrit, sur les canaux
 * activés dans les préférences (e-mail / Web Push / WhatsApp / SMS). Déclenché
 * par l'Outbox → EventEmitter2. Anti-spam : un canal n'est pas re-notifié pour
 * une même conversation avant `cooldownSeconds`. Erreurs avalées (au mieux).
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
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly settingsRepo: NotificationSettingsRepository,
    @Inject(DISPATCH_LOG_REPOSITORY) private readonly dispatchLog: DispatchLogRepository,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly pushSubs: PushSubscriptionRepository,
  ) {
    this.dashboardUrl = config.get('notifications', { infer: true }).dashboardUrl;
  }

  @OnEvent('messaging.message.sent')
  async onMessage(envelope: OutboxEnvelope): Promise<void> {
    try {
      const p = envelope.payload as unknown as MessagePayload;
      const shopId = envelope.shopId;
      if (p.sender !== 'buyer' || !shopId) return;

      const [shop, members, settings] = await Promise.all([
        this.shops.findById(shopId),
        this.memberships.listMembers(shopId),
        this.settingsRepo.get(shopId),
      ]);

      const recipients = members.map((m) => m.email).filter(Boolean);
      const pushSubs = await this.pushSubs.listForUsers(members.map((m) => m.userId));
      const phone = shop?.toSnapshot().whatsapp ?? null;
      const shopName = shop?.toSnapshot().name ?? 'votre boutique';

      const lastSent: Record<NotificationChannel, number | null> = {
        email: (await this.dispatchLog.lastSentAt(shopId, p.conversationId, 'email'))?.getTime() ?? null,
        push: (await this.dispatchLog.lastSentAt(shopId, p.conversationId, 'push'))?.getTime() ?? null,
        whatsapp:
          (await this.dispatchLog.lastSentAt(shopId, p.conversationId, 'whatsapp'))?.getTime() ?? null,
        sms: (await this.dispatchLog.lastSentAt(shopId, p.conversationId, 'sms'))?.getTime() ?? null,
      };

      const channels = selectChannels({
        settings,
        now: Date.now(),
        lastSent,
        hasEmailRecipients: recipients.length > 0,
        hasPhone: Boolean(phone),
        hasPush: pushSubs.length > 0,
      });
      if (channels.length === 0) return;

      const about = p.productName ? ` à propos de « ${p.productName} »` : '';
      const link = `${this.dashboardUrl}/s/${shopId}/inbox/${p.conversationId}`;
      const shortText = `${p.buyerName} vous a écrit sur ${shopName}${about} : « ${p.preview.slice(
        0,
        140,
      )} ». Répondre : ${link}`;

      const ctx: DispatchContext = {
        recipients,
        pushSubs,
        phone,
        shopName,
        about,
        link,
        shortText,
        preview: p.preview,
        buyerName: p.buyerName,
      };

      const sent: NotificationChannel[] = [];
      for (const channel of channels) {
        if (await this.dispatch(channel, ctx)) {
          await this.dispatchLog.record(shopId, p.conversationId, channel);
          sent.push(channel);
        }
      }

      if (sent.length > 0) {
        this.logger.log(`notification [${sent.join(', ')}] (conv ${p.conversationId})`);
      }
    } catch (err) {
      this.logger.error(`échec de la notification: ${(err as Error).message}`);
    }
  }

  private async dispatch(channel: NotificationChannel, ctx: DispatchContext): Promise<boolean> {
    try {
      if (channel === 'email') {
        return this.mailer.send({
          to: ctx.recipients,
          subject: `Nouveau message de ${ctx.buyerName}${ctx.about ? ' —' + ctx.about : ''}`,
          text: [
            `${ctx.buyerName} vous a écrit sur ${ctx.shopName}${ctx.about} :`,
            '',
            `« ${ctx.preview} »`,
            '',
            `Répondre : ${ctx.link}`,
          ].join('\n'),
          html: `<p><strong>${escapeHtml(ctx.buyerName)}</strong> vous a écrit sur ${escapeHtml(
            ctx.shopName,
          )}${escapeHtml(ctx.about)} :</p><blockquote>${escapeHtml(
            ctx.preview,
          )}</blockquote><p><a href="${ctx.link}">Répondre dans la boîte de réception</a></p>`,
        });
      }
      if (channel === 'push') {
        const results = await Promise.all(
          ctx.pushSubs.map((s) =>
            this.push.send(
              s,
              {
                title: `${ctx.buyerName} — ${ctx.shopName}`,
                body: ctx.preview.slice(0, 160),
                url: ctx.link,
                tag: `conv-${ctx.link.split('/').pop() ?? ''}`,
              },
              (endpoint) => void this.pushSubs.removeStale(endpoint),
            ),
          ),
        );
        return results.some(Boolean);
      }
      if (!ctx.phone) return false;
      if (channel === 'whatsapp') return this.whatsapp.send(ctx.phone, ctx.shortText);
      return this.sms.send(ctx.phone, ctx.shortText);
    } catch (err) {
      this.logger.warn(`canal ${channel} en échec : ${(err as Error).message}`);
      return false;
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
