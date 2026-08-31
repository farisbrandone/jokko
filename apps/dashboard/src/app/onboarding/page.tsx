'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';
import { VERTICALS } from '@/lib/types';
import { Shell } from '@/components/shell';

const LABELS: Record<(typeof VERTICALS)[number], string> = {
  electronique: 'Électronique',
  'mode-accessoires': 'Mode & accessoires',
  'maison-cuisine': 'Maison & cuisine',
  'beaute-soin': 'Beauté & soin',
  sport: 'Sport',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [verticals, setVerticals] = useState<string[]>(['electronique']);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (v: string) =>
    setVerticals((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { shop } = await post<{ shop: { id: string } }>('/api/proxy/shops', {
        name,
        verticals,
        ...(whatsapp ? { whatsapp } : {}),
      });
      router.push(`/s/${shop.id}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form
        onSubmit={submit}
        className="max-w-lg flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Créez votre boutique
        </h1>
        <label className="text-sm flex flex-col gap-1">
          Nom de la boutique
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          Numéro WhatsApp (format +221…)
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+221771234567"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
          />
        </label>
        <fieldset className="text-sm">
          <legend className="mb-1">Verticales</legend>
          <div className="flex flex-wrap gap-2">
            {VERTICALS.map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => toggle(v)}
                className={`rounded-full border px-3 py-1 ${
                  verticals.includes(v)
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                {LABELS[v]}
              </button>
            ))}
          </div>
        </fieldset>
        {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
        <button
          disabled={busy || verticals.length === 0}
          className="self-start rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy ? 'Création…' : 'Créer la boutique'}
        </button>
      </form>
    </Shell>
  );
}
