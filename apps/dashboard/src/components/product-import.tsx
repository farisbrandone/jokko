'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { CsvImportResult, DraftProduct } from '@jokko/contracts';
import { Button } from '@jokko/ui';
import { bffSend } from '@/lib/bff';

const CSV_SAMPLE = 'nom,prix,stock,catégorie,image\nExemple,9900,5,Maison,https://…';

export function ProductImport({ shopId }: { shopId: string }) {
  const router = useRouter();
  const base = `/api/proxy/shops/${shopId}`;
  const [tab, setTab] = useState<'url' | 'csv'>('url');

  // ── URL ──
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<DraftProduct | null>(null);
  const preview = useMutation({
    mutationFn: () => bffSend<DraftProduct>(`${base}/import/url`, 'POST', { url: url.trim() }),
    onSuccess: (d) => setDraft(d),
  });
  const create = useMutation({
    mutationFn: (d: DraftProduct) =>
      bffSend(`${base}/products`, 'POST', {
        name: d.name,
        description: d.description,
        category: d.category,
        price: { amount: d.priceAmount, currency: d.currency },
        stock: d.stock,
        images: d.images,
      }),
    onSuccess: () => router.push(`/s/${shopId}`),
  });

  // ── CSV ──
  const [csv, setCsv] = useState('');
  const importCsv = useMutation({
    mutationFn: () => bffSend<CsvImportResult>(`${base}/import/csv`, 'POST', { csv }),
  });

  const err =
    (preview.error as Error | null)?.message ??
    (create.error as Error | null)?.message ??
    (importCsv.error as Error | null)?.message ??
    null;

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <div className="flex gap-1 text-sm">
        {(['url', 'csv'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-[var(--radius-btn)] px-3 py-1 ${
              tab === k
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {k === 'url' ? "Depuis une page produit" : 'Depuis un CSV'}
          </button>
        ))}
      </div>

      {tab === 'url' ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://boutique.exemple.com/produit/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <Button onClick={() => preview.mutate()} disabled={preview.isPending || !url.trim()}>
              {preview.isPending ? '…' : 'Prévisualiser'}
            </Button>
          </div>

          {draft ? (
            <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] p-3">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-medium"
              />
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="w-1/2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={draft.priceAmount}
                  onChange={(e) =>
                    setDraft({ ...draft, priceAmount: Number(e.target.value) || 0 })
                  }
                  className="w-1/4 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })}
                  className="w-1/4 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                {draft.images.length} image(s) · prix en centimes ({draft.currency})
              </p>
              <Button onClick={() => create.mutate(draft)} disabled={create.isPending}>
                {create.isPending ? '…' : 'Créer le produit (brouillon)'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-muted)]">
            En-tête requis : <code>name</code> (ou <code>nom</code>) et <code>price</code> (ou{' '}
            <code>prix</code>). Colonnes reconnues : description, catégorie, stock, image.
          </p>
          <textarea
            rows={8}
            placeholder={CSV_SAMPLE}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-xs"
          />
          <Button onClick={() => importCsv.mutate()} disabled={importCsv.isPending || !csv.trim()}>
            {importCsv.isPending ? '…' : 'Importer'}
          </Button>
          {importCsv.data ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 text-sm">
              <p className="text-[var(--color-good)]">
                {importCsv.data.created} produit(s) créé(s) en brouillon.
              </p>
              {importCsv.data.skipped.length > 0 ? (
                <ul className="mt-2 text-xs text-[var(--color-danger)]">
                  {importCsv.data.skipped.map((s) => (
                    <li key={s.line}>
                      Ligne {s.line} : {s.error}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2">
                <a href={`/s/${shopId}`} className="underline">
                  Voir le catalogue
                </a>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {err ? <p className="text-xs text-[var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
