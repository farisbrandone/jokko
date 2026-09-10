'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch } from '@/lib/client';
import type { ShopProfile, ThemePreset } from '@/lib/types';

const PRESETS: { value: ThemePreset; label: string }[] = [
  { value: 'grid', label: 'Grille' },
  { value: 'editorial', label: 'Éditorial' },
  { value: 'single', label: 'Colonne' },
  { value: 'dense', label: 'Dense' },
];

type Form = {
  name: string;
  whatsapp: string;
  themePreset: ThemePreset;
  brandColor: string;
  useBrandColor: boolean;
  lowStockThreshold: string;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ShopProfileForm({ initial }: { initial: ShopProfile }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    name: initial.name,
    whatsapp: initial.whatsapp ?? '',
    themePreset: initial.themePreset,
    brandColor: initial.brandColor ?? '#c2410c',
    useBrandColor: initial.brandColor != null,
    lowStockThreshold: String(initial.lowStockThreshold ?? 3),
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.whatsapp && !/^\+[1-9]\d{6,14}$/.test(form.whatsapp)) {
      alert('Numéro WhatsApp : format international attendu, ex. +221771234567');
      return;
    }
    if (form.useBrandColor && !HEX_RE.test(form.brandColor)) {
      alert('Couleur de marque : hexadécimal #rrggbb attendu');
      return;
    }
    setBusy(true);
    try {
      await patch(`/api/proxy/shops/${initial.id}`, {
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim() || null,
        themePreset: form.themePreset,
        brandColor: form.useBrandColor ? form.brandColor.toLowerCase() : null,
        lowStockThreshold: Math.max(0, Math.min(999, Number(form.lowStockThreshold) || 0)),
      });
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
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Nom de la boutique</span>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          minLength={2}
          maxLength={80}
          required
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Numéro WhatsApp</span>
        <input
          value={form.whatsapp}
          onChange={(e) => set('whatsapp', e.target.value)}
          placeholder="+221771234567"
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Mise en page de la vitrine</span>
        <select
          value={form.themePreset}
          onChange={(e) => set('themePreset', e.target.value as ThemePreset)}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Alerte « stock bas » à partir de</span>
        <input
          inputMode="numeric"
          value={form.lowStockThreshold}
          onChange={(e) => set('lowStockThreshold', e.target.value.replace(/\D/g, ''))}
          className="w-24 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        />
        <span className="text-xs text-[var(--color-muted)]">
          Un produit (ou une déclinaison) à ce niveau ou en dessous est signalé
          dans le tableau de bord.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.useBrandColor}
            onChange={(e) => set('useBrandColor', e.target.checked)}
          />
          <span className="font-medium">Couleur de marque personnalisée</span>
        </label>
        {form.useBrandColor ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brandColor}
              onChange={(e) => set('brandColor', e.target.value)}
              className="h-9 w-14 rounded border border-[var(--color-border)] bg-transparent"
            />
            <input
              value={form.brandColor}
              onChange={(e) => set('brandColor', e.target.value)}
              className="w-32 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono"
            />
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            La vitrine utilise la couleur Jokko par défaut.
          </p>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Enregistrer
        </button>
        {saved ? <span className="text-xs text-[var(--color-muted)]">Enregistré.</span> : null}
      </div>
    </form>
  );
}
