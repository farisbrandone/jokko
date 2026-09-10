'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { del, patch, post } from '@/lib/client';
import type { DiscountCode } from '@/lib/types';

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

type Draft = {
  code: string;
  kind: 'percent' | 'fixed';
  value: string;
  minSubtotal: string;
  maxRedemptions: string;
  expiresAt: string;
};

const emptyDraft: Draft = {
  code: '',
  kind: 'percent',
  value: '',
  minSubtotal: '',
  maxRedemptions: '',
  expiresAt: '',
};

export function DiscountCodesManager({
  shopId,
  initial,
}: {
  shopId: string;
  initial: DiscountCode[];
}) {
  const router = useRouter();
  const base = `/api/proxy/shops/${shopId}/discounts`;
  const [codes, setCodes] = useState<DiscountCode[]>(initial);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.round(Number(draft.value) || 0);
    if (!draft.code.trim() || value <= 0) {
      setErr('Renseignez un code et une valeur.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const created = await post<DiscountCode>(base, {
        code: draft.code.trim(),
        kind: draft.kind,
        value,
        minSubtotal: draft.minSubtotal.trim() ? Math.round(Number(draft.minSubtotal)) : null,
        maxRedemptions: draft.maxRedemptions.trim()
          ? Math.round(Number(draft.maxRedemptions))
          : null,
        expiresAt: draft.expiresAt
          ? new Date(`${draft.expiresAt}T23:59:59`).toISOString()
          : null,
      });
      setCodes((c) => [created, ...c]);
      setDraft(emptyDraft);
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (code: DiscountCode) => {
    const updated = await patch<DiscountCode>(`${base}/${code.id}`, { active: !code.active });
    setCodes((c) => c.map((x) => (x.id === code.id ? updated : x)));
  };

  const remove = async (code: DiscountCode) => {
    if (!confirm(`Supprimer le code ${code.code} ?`)) return;
    await del(`${base}/${code.id}`);
    setCodes((c) => c.filter((x) => x.id !== code.id));
    router.refresh();
  };

  const describe = (c: DiscountCode): string => {
    const parts = [c.kind === 'percent' ? `−${c.value} %` : `−${c.value} (montant fixe)`];
    if (c.minSubtotal) parts.push(`dès ${c.minSubtotal} de panier`);
    if (c.maxRedemptions) parts.push(`${c.redeemedCount}/${c.maxRedemptions} utilisés`);
    else parts.push(`${c.redeemedCount} utilisé(s)`);
    if (c.expiresAt) {
      parts.push(
        `expire le ${new Date(c.expiresAt).toLocaleDateString('fr', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`,
      );
    }
    return parts.join(' · ');
  };

  const expired = (c: DiscountCode) => c.expiresAt != null && new Date(c.expiresAt) <= new Date();

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={create}
        className="grid max-w-2xl gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] p-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Code
          <input
            value={draft.code}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
              }))
            }
            maxLength={24}
            placeholder="BIENVENUE10"
            className={`${field} uppercase`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as Draft['kind'] }))}
            className={field}
          >
            <option value="percent">Pourcentage</option>
            <option value="fixed">Montant fixe</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {draft.kind === 'percent' ? 'Pourcentage (1–90)' : 'Montant (devise boutique)'}
          <input
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value.replace(/\D/g, '') }))}
            inputMode="numeric"
            placeholder={draft.kind === 'percent' ? '10' : '2000'}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Panier minimum (facultatif)
          <input
            value={draft.minSubtotal}
            onChange={(e) =>
              setDraft((d) => ({ ...d, minSubtotal: e.target.value.replace(/\D/g, '') }))
            }
            inputMode="numeric"
            placeholder="—"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Utilisations max (facultatif)
          <input
            value={draft.maxRedemptions}
            onChange={(e) =>
              setDraft((d) => ({ ...d, maxRedemptions: e.target.value.replace(/\D/g, '') }))
            }
            inputMode="numeric"
            placeholder="illimité"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Date d&apos;expiration (facultatif)
          <input
            type="date"
            value={draft.expiresAt}
            onChange={(e) => setDraft((d) => ({ ...d, expiresAt: e.target.value }))}
            className={field}
          />
        </label>

        {err ? (
          <p className="text-sm text-[var(--color-danger)] sm:col-span-2">{err}</p>
        ) : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
          >
            {busy ? '…' : 'Créer le code'}
          </button>
        </div>
      </form>

      {codes.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Aucun code pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {codes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-card)] border border-[var(--color-border)] p-3"
            >
              <span className="font-[family-name:var(--font-display)] font-bold tracking-wide">
                {c.code}
              </span>
              {!c.active ? (
                <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
                  désactivé
                </span>
              ) : expired(c) ? (
                <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-danger)]">
                  expiré
                </span>
              ) : (
                <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] text-[var(--color-brand)]">
                  actif
                </span>
              )}
              <span className="w-full text-xs text-[var(--color-muted)] sm:w-auto sm:flex-1">
                {describe(c)}
              </span>
              <button
                type="button"
                onClick={() => void toggle(c)}
                className="text-xs underline hover:text-[var(--color-ink)]"
              >
                {c.active ? 'Désactiver' : 'Réactiver'}
              </button>
              <button
                type="button"
                onClick={() => void remove(c)}
                className="text-xs text-[var(--color-danger)] underline"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
