import type { NotificationChannel, NotificationSettings } from '@jokko/contracts';

/** Envoi d'un SMS transactionnel (dev : log ; prod : Termii). */
export const SMS_SENDER = Symbol('SMS_SENDER');
export interface SmsSender {
  send(to: string, text: string): Promise<boolean>;
}

/** Envoi d'un message WhatsApp transactionnel (dev : log ; prod : Termii). */
export const WHATSAPP_SENDER = Symbol('WHATSAPP_SENDER');
export interface WhatsAppSender {
  send(to: string, text: string): Promise<boolean>;
}

export const NOTIFICATION_SETTINGS_REPOSITORY = Symbol('NOTIFICATION_SETTINGS_REPOSITORY');
export interface NotificationSettingsRepository {
  /** Retourne les préférences de la boutique, ou les valeurs par défaut si absentes. */
  get(shopId: string): Promise<NotificationSettings>;
  update(shopId: string, patch: Partial<NotificationSettings>): Promise<NotificationSettings>;
}

export const DISPATCH_LOG_REPOSITORY = Symbol('DISPATCH_LOG_REPOSITORY');
export interface DispatchLogRepository {
  /** Date du dernier envoi pour (conversation, canal), ou null. */
  lastSentAt(
    shopId: string,
    conversationId: string,
    channel: NotificationChannel,
  ): Promise<Date | null>;
  record(shopId: string, conversationId: string, channel: NotificationChannel): Promise<void>;
}
