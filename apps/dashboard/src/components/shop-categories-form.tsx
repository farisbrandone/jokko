'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch } from '@/lib/client';

const MAX = 50;

export function ShopCategoriesForm({
  shopId,
  initial,
}: {
  shopId: string;
  initial: string[];
}) {
  const router = useRouter();
  const [list, setList] = useState<string[]>(initial);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = JSON.stringify(list) !== JSON.stringify(initial);

  const add = () => {
    const value = draft.trim().slice(0, 40);
    if (!value) return;
    if (list.some((c) => c.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setDraft('');
      return;
    }
    if (list.length >= MAX) return;
    setList((l) => [...l, value]);
    setDraft('');
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
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await patch(`/api/proxy/shops/${shopId}`, { categories: list });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          maxLength={40}
          placeholder="Ex. Téléphones, Robes, Épices…"
          className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || list.length >= MAX}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Aucune catégorie. Ajoutez-en pour organiser votre catalogue et vos filtres.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.map((cat, i) => (
            <li
              key={`${cat}-${i}`}
              className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
            >
              <span className="flex-1 capitalize">{cat}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Monter"
                className="text-[var(--color-faint)] hover:text-[var(--color-ink)] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                aria-label="Descendre"
                className="text-[var(--color-faint)] hover:text-[var(--color-ink)] disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Retirer ${cat}`}
                className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs hover:bg-[var(--color-danger)] hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

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
        {saved && !dirty ? (
          <span className="text-xs text-[var(--color-good)]">✓ Enregistré.</span>
        ) : null}
      </div>
    </div>
  );
}
