'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch, post } from '@/lib/client';
import type { ShopProfile } from '@/lib/types';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface UploadUrl {
  uploadUrl: string;
  publicUrl: string;
}

/** Noir/blanc lisible sur une couleur hex (luminance WCAG simplifiée). */
function ink(hex: string): string {
  if (!HEX_RE.test(hex)) return '#fff';
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return l > 0.42 ? '#1c1917' : '#ffffff';
}

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

export function ShopAppearanceForm({ initial }: { initial: ShopProfile }) {
  const router = useRouter();
  const [f, setF] = useState({
    heroTitle: initial.heroTitle ?? '',
    heroSubtitle: initial.heroSubtitle ?? '',
    announcement: initial.announcement ?? '',
    heroImageUrl: initial.heroImageUrl,
    accentColor: initial.accentColor ?? '#0ea5e9',
    useAccent: initial.accentColor != null,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const brand = initial.brandColor && HEX_RE.test(initial.brandColor) ? initial.brandColor : '#c2410c';
  const accent = f.useAccent && HEX_RE.test(f.accentColor) ? f.accentColor : brand;

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const { uploadUrl, publicUrl } = await post<UploadUrl>(
        `/api/proxy/shops/${initial.id}/media/upload-url`,
        { contentType: file.type, filename: file.name },
      );
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Téléversement échoué (${put.status})`);
      set('heroImageUrl', publicUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (f.useAccent && !HEX_RE.test(f.accentColor)) {
      setErr('Couleur d’accent : hexadécimal #rrggbb attendu');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await patch(`/api/proxy/shops/${initial.id}`, {
        heroTitle: f.heroTitle.trim() || null,
        heroSubtitle: f.heroSubtitle.trim() || null,
        announcement: f.announcement.trim() || null,
        heroImageUrl: f.heroImageUrl || null,
        accentColor: f.useAccent ? f.accentColor.toLowerCase() : null,
      });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const previewTitle = f.heroTitle.trim() || initial.name;
  const previewSub =
    f.heroSubtitle.trim() || 'Toute la gamme, en un lien.';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Contrôles */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Grand titre</span>
          <input
            value={f.heroTitle}
            onChange={(e) => set('heroTitle', e.target.value)}
            maxLength={80}
            placeholder={initial.name}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Sous-titre</span>
          <textarea
            value={f.heroSubtitle}
            onChange={(e) => set('heroSubtitle', e.target.value)}
            maxLength={160}
            rows={2}
            placeholder="Ex. Livraison Douala & Yaoundé — paiement à la livraison"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Bandeau d’annonce</span>
          <input
            value={f.announcement}
            onChange={(e) => set('announcement', e.target.value)}
            maxLength={160}
            placeholder="Ex. −20 % ce week-end avec le code JOKKO"
            className={field}
          />
          <span className="text-xs text-[var(--color-muted)]">
            Affiché en haut de toutes les pages de la vitrine. Laisser vide pour masquer.
          </span>
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Image de bannière</span>
          {f.heroImageUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.heroImageUrl}
                alt=""
                className="h-16 w-28 rounded-md border border-[var(--color-border)] object-cover"
              />
              <button
                type="button"
                onClick={() => set('heroImageUrl', null)}
                className="text-xs text-[var(--color-danger)] hover:underline"
              >
                Retirer
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          {uploading ? (
            <span className="text-xs text-[var(--color-muted)]">Téléversement…</span>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.useAccent}
              onChange={(e) => set('useAccent', e.target.checked)}
            />
            <span className="font-medium">Couleur d’accent</span>
          </label>
          {f.useAccent ? (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={f.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className="h-9 w-14 rounded border border-[var(--color-border)] bg-transparent"
              />
              <input
                value={f.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className="w-32 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm"
              />
            </div>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              Utilisée pour les badges de promo et les mises en avant. Sinon, la
              couleur de marque est reprise.
            </p>
          )}
        </fieldset>

        {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}

        <div className="flex items-center gap-3">
          <button
            disabled={busy || uploading}
            className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
          >
            Enregistrer
          </button>
          {saved ? <span className="text-xs text-[var(--color-good)]">✓ Enregistré.</span> : null}
        </div>
      </form>

      {/* Aperçu en direct */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-faint)]">
          Aperçu
        </p>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg)]">
          {f.announcement.trim() ? (
            <div
              className="px-3 py-1 text-center text-[11px] font-medium"
              style={{ background: brand, color: ink(brand) }}
            >
              {f.announcement.trim()}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <span className="text-sm font-bold">{initial.name}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: brand, color: ink(brand) }}
            >
              WhatsApp
            </span>
          </div>

          <div className="p-3">
            {f.heroImageUrl ? (
              <div className="relative overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.heroImageUrl} alt="" className="h-32 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="text-base font-bold leading-tight">{previewTitle}</p>
                  <p className="line-clamp-2 text-[11px] text-white/90">{previewSub}</p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-lg p-4"
                style={{ background: `color-mix(in srgb, ${brand} 14%, white)` }}
              >
                <p className="text-lg font-bold leading-tight">{previewTitle}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{previewSub}</p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <div className="relative h-16 bg-[var(--color-surface-2)]">
                    {i === 0 ? (
                      <span
                        className="absolute right-1 top-1 rounded px-1 text-[10px] font-medium"
                        style={{ background: accent, color: ink(accent) }}
                      >
                        −15%
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="h-1.5 w-3/4 rounded bg-[var(--color-border)]" />
                    <p className="mt-1.5 text-xs font-semibold" style={{ color: accent }}>
                      24 900 F
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
