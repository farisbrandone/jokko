import { describe, expect, it } from 'vitest';
import type { NotificationSettings } from '@jokko/contracts';
import { selectChannels } from './channel-policy';

const base: NotificationSettings = {
  emailEnabled: true,
  whatsappEnabled: true,
  smsEnabled: true,
  cooldownSeconds: 300,
};
const noneSent = { email: null, whatsapp: null, sms: null };

describe('selectChannels', () => {
  it('retient les canaux activés quand destinataires disponibles', () => {
    expect(
      selectChannels({
        settings: base,
        now: 1_000_000,
        lastSent: noneSent,
        hasEmailRecipients: true,
        hasPhone: true,
      }),
    ).toEqual(['email', 'whatsapp', 'sms']);
  });

  it('exclut WhatsApp/SMS sans numéro et e-mail sans destinataire', () => {
    expect(
      selectChannels({
        settings: base,
        now: 1_000_000,
        lastSent: noneSent,
        hasEmailRecipients: false,
        hasPhone: false,
      }),
    ).toEqual([]);
  });

  it('exclut un canal désactivé dans les préférences', () => {
    expect(
      selectChannels({
        settings: { ...base, whatsappEnabled: false },
        now: 1_000_000,
        lastSent: noneSent,
        hasEmailRecipients: true,
        hasPhone: true,
      }),
    ).toEqual(['email', 'sms']);
  });

  it('respecte le cooldown : canal envoyé récemment est ignoré', () => {
    const now = 1_000_000;
    expect(
      selectChannels({
        settings: base,
        now,
        lastSent: { email: now - 299_000, whatsapp: null, sms: null },
        hasEmailRecipients: true,
        hasPhone: true,
      }),
    ).toEqual(['whatsapp', 'sms']);
  });

  it('cooldown écoulé : le canal redevient éligible', () => {
    const now = 1_000_000;
    expect(
      selectChannels({
        settings: base,
        now,
        lastSent: { email: now - 300_000, whatsapp: null, sms: null },
        hasEmailRecipients: true,
        hasPhone: true,
      }),
    ).toEqual(['email', 'whatsapp', 'sms']);
  });

  it('cooldown à 0 : jamais de blocage', () => {
    const now = 1_000_000;
    expect(
      selectChannels({
        settings: { ...base, cooldownSeconds: 0 },
        now,
        lastSent: { email: now - 1, whatsapp: now - 1, sms: now - 1 },
        hasEmailRecipients: true,
        hasPhone: true,
      }),
    ).toEqual(['email', 'whatsapp', 'sms']);
  });
});
