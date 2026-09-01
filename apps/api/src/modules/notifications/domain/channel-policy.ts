import type { NotificationChannel, NotificationSettings } from '@jokko/contracts';

export interface ChannelDecisionInput {
  settings: NotificationSettings;
  /** Horodatage courant (ms). */
  now: number;
  /** Dernier envoi par canal (ms), ou null si jamais envoyé. */
  lastSent: Record<NotificationChannel, number | null>;
  /** La boutique a-t-elle des destinataires e-mail ? */
  hasEmailRecipients: boolean;
  /** La boutique a-t-elle un numéro (WhatsApp / SMS) configuré ? */
  hasPhone: boolean;
}

/**
 * Décide, pour une notification donnée, quels canaux déclencher :
 * canal activé ET destinataire disponible ET hors fenêtre de cooldown.
 * Fonction pure — testable sans infrastructure.
 */
export function selectChannels(input: ChannelDecisionInput): NotificationChannel[] {
  const cooldownMs = input.settings.cooldownSeconds * 1000;

  const withinCooldown = (channel: NotificationChannel): boolean => {
    const last = input.lastSent[channel];
    return last != null && input.now - last < cooldownMs;
  };

  const out: NotificationChannel[] = [];
  if (input.settings.emailEnabled && input.hasEmailRecipients && !withinCooldown('email')) {
    out.push('email');
  }
  if (input.settings.whatsappEnabled && input.hasPhone && !withinCooldown('whatsapp')) {
    out.push('whatsapp');
  }
  if (input.settings.smsEnabled && input.hasPhone && !withinCooldown('sms')) {
    out.push('sms');
  }
  return out;
}
