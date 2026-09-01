import { z } from 'zod';

/** Canaux de notification vendeur pris en charge. */
export const notificationChannelSchema = z.enum(['email', 'whatsapp', 'sms', 'push']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/**
 * Préférences de notification d'une boutique. `cooldownSeconds` : délai minimal
 * entre deux notifications pour une même conversation et un même canal (anti-spam).
 */
export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  cooldownSeconds: z.number().int().min(0).max(86_400),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const updateNotificationSettingsSchema = notificationSettingsSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Au moins un champ est requis' });
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  whatsappEnabled: false,
  smsEnabled: false,
  pushEnabled: true,
  cooldownSeconds: 300,
};

/** Abonnement Web Push transmis par le navigateur du membre. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().url().max(1000) });
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;

export const pushPublicKeySchema = z.object({ key: z.string().nullable() });
export type PushPublicKey = z.infer<typeof pushPublicKeySchema>;
