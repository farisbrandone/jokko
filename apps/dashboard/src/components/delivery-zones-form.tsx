'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch } from '@/lib/client';

type Zone = { id?: string; label: string; fee: number };

const MAX = 40;

export function DeliveryZonesForm({
  shopId,
  initial,
}: {
  shopId: string;
  initial: Zone[];
}) {
  const router = useRouter();
  const [list, setList] = useState<Zone[]>(initial);
  const [draft, setDraft] = useState({ label: '', fee: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = JSON.stringify(list) !== JSON.stringify(initial);

  const add = () => {
    const label = draft.label.trim().slice(0, 60);
    const fee = Math.max(0, Math.round(Number(draft.fee) || 0));
    if (!label || list.length >= MAX) return;
    if (list.some((z) => z.label.toLocaleLowerCase() === label.toLocaleLowerCase())) {
      setDraft({ label: '', fee: '' });
      return;
    }
    setList((l) => [...l, { label, fee }]);
    setDraft({ label: '', fee: '' });
    setSaved(false);
  };

  const setFee = (i: number, v: string) => {
    const fee = Math.max(0, Math.round(Number(v) || 0));
    setList((l) => l.map((z, idx) => (idx === i ? { ...z, fee } : z)));
    setSaved(false);
  };
  const remove = (i: number) => {
    setList((l) => l.filter((_, idx) => idx !== i));
    setSaved(false);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    setList((l) => {
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await patch(`/api/proxy/shops/${shopId}`, { deliveryZones: list });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const feeInput =
    'w-28 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-right text-sm tabular-nums';

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          maxLength={60}
          placeholder="Ville / quartier (ex. Akwa, Bonabéri…)"
          className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
        <input
          value={draft.fee}
          onChange={(e) => setDraft((d) => ({ ...d, fee: e.target.value.replace(/\D/g, '') }))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          inputMode="numeric"
          placeholder="Frais"
          className={feeInput}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.label.trim() || list.length >= MAX}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Aucune zone. Le retrait en boutique reste toujours proposé (gratuit).
          Ajoutez des zones pour facturer la livraison au panier.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.map((z, i) => (
            <li
              key={z.id ?? `${z.label}-${i}`}
              className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
            >
              <span className="flex-1 capitalize">{z.label}</span>
              <input
                value={String(z.fee)}
                onChange={(e) => setFee(i, e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className={feeInput}
                aria-label={`Frais pour ${z.label}`}
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="text-[var(--color-faint)] hover:text-[var(--color-ink)] disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Descendre" className="text-[var(--color-faint)] hover:text-[var(--color-ink)] disabled:opacity-30">↓</button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Retirer ${z.label}`}
                className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs hover:bg-[var(--color-danger)] hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        Frais exprimés dans la devise de la boutique (FCFA, sans décimales).
      </p>
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
        >
          Enregistrer
        </button>
        {saved && !dirty ? <span className="text-xs text-[var(--color-good)]">✓ Enregistré.</span> : null}
      </div>
    </div>
  );
}
