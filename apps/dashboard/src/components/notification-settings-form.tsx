'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch } from '@/lib/client';
import type { NotificationSettings } from '@/lib/types';

const CHANNELS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: 'emailEnabled', label: 'E-mail', hint: 'Envoyé à tous les membres de la boutique.' },
  {
    key: 'pushEnabled',
    label: 'Notifications push',
    hint: 'Sur les appareils où vous avez activé les notifications ci-dessous.',
  },
  { key: 'whatsappEnabled', label: 'WhatsApp', hint: 'Envoyé au numéro WhatsApp de la boutique.' },
  { key: 'smsEnabled', label: 'SMS', hint: 'Envoyé au numéro WhatsApp de la boutique.' },
];

export function NotificationSettingsForm({
  shopId,
  initial,
}: {
  shopId: string;
  initial: NotificationSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<NotificationSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = (Object.keys(form) as (keyof NotificationSettings)[]).some(
    (k) => form[k] !== initial[k],
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      const next = await patch<NotificationSettings>(
        `/api/proxy/shops/${shopId}/settings/notifications`,
        form,
      );
      setForm(next);
      setSaved(true);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-5 max-w-lg">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium mb-1">Canaux</legend>
        {CHANNELS.map((c) => (
          <label key={c.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={Boolean(form[c.key])}
              onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.checked }))}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{c.label}</span>
              <span className="block text-xs text-[var(--color-muted)]">{c.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Délai anti-spam (secondes)</span>
        <span className="text-xs text-[var(--color-muted)]">
          Délai minimal entre deux notifications pour une même conversation.
        </span>
        <input
          type="number"
          min={0}
          max={86400}
          value={form.cooldownSeconds}
          onChange={(e) =>
            setForm((f) => ({ ...f, cooldownSeconds: Number(e.target.value) || 0 }))
          }
          className="mt-1 w-32 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          disabled={busy || !dirty}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Enregistrer
        </button>
        {saved && !dirty ? (
          <span className="text-xs text-[var(--color-muted)]">Enregistré.</span>
        ) : null}
      </div>
    </form>
  );
}
