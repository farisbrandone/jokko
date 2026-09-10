'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch, post } from '@/lib/client';
import { VERTICALS, type Product, type ProductVariant } from '@/lib/types';

interface Props {
  shopId: string;
  product?: Product;
  /** Catégories déclarées par la boutique (Réglages) — sinon les verticales par défaut. */
  categories?: string[];
}

interface UploadUrl {
  uploadUrl: string;
  publicUrl: string;
}

type VariantDraft = { id?: string; label: string; sku: string; priceAmount: string; stock: string };

const toDraft = (v: ProductVariant): VariantDraft => ({
  id: v.id,
  label: v.label,
  sku: v.sku ?? '',
  priceAmount: v.priceAmount != null ? String(v.priceAmount) : '',
  stock: String(v.stock),
});

export function ProductForm({ shopId, product, categories = [] }: Props) {
  const router = useRouter();
  const editing = Boolean(product);
  const categoryOptions = categories.length > 0 ? categories : [...VERTICALS];

  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(
    product?.category ?? categoryOptions[0] ?? 'electronique',
  );
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(String(product?.price.amount ?? ''));
  const [compareAt, setCompareAt] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice.amount) : '',
  );
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [variants, setVariants] = useState<VariantDraft[]>(
    (product?.variants ?? []).map(toDraft),
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const hasVariants = variants.length > 0;
  const variantStockTotal = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  const setV = (i: number, patchV: Partial<VariantDraft>) =>
    setVariants((list) => list.map((v, idx) => (idx === i ? { ...v, ...patchV } : v)));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setErr(null);
    try {
      for (const file of Array.from(files)) {
        const { uploadUrl, publicUrl } = await post<UploadUrl>(
          `/api/proxy/shops/${shopId}/media/upload-url`,
          { contentType: file.type, filename: file.name },
        );
        const put = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': file.type },
          body: file,
        });
        if (!put.ok) throw new Error(`Téléversement échoué (${put.status})`);
        setImages((s) => [...s, publicUrl]);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setSaved(false);
    const cleanVariants = variants
      .filter((v) => v.label.trim())
      .map((v) => ({
        id: v.id,
        label: v.label.trim(),
        sku: v.sku.trim() || null,
        priceAmount: v.priceAmount.trim() ? Number(v.priceAmount) : null,
        stock: Math.max(0, Number(v.stock) || 0),
      }));
    const payload = {
      name,
      category,
      description,
      price: { amount: Number(price), currency: 'XOF' },
      compareAtPrice: compareAt ? { amount: Number(compareAt), currency: 'XOF' } : null,
      stock: cleanVariants.length > 0 ? variantStockTotal : Number(stock),
      images,
      variants: cleanVariants,
    };
    try {
      if (editing && product) {
        await patch(`/api/proxy/shops/${shopId}/products/${product.id}`, payload);
        router.refresh();
        setSaved(true);
      } else {
        const created = await post<{ id: string }>(
          `/api/proxy/shops/${shopId}/products`,
          payload,
        );
        if (!created?.id) throw new Error('Réponse inattendue du serveur (produit sans identifiant).');
        router.push(`/s/${shopId}/products/${created.id}`);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

  return (
    <form onSubmit={save} className="max-w-xl flex flex-col gap-4">
      <label className="text-sm flex flex-col gap-1">
        Nom
        <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>

      <label className="text-sm flex flex-col gap-1">
        Catégorie
        <input
          required
          list="verticals"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={field}
        />
        <datalist id="verticals">
          {categoryOptions.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </label>

      <label className="text-sm flex flex-col gap-1">
        Description
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={field}
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm flex flex-col gap-1">
          Prix (F CFA)
          <input
            required
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={field}
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          Prix barré
          <input
            inputMode="numeric"
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
            className={field}
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          Stock
          {hasVariants ? (
            <span className={`${field} text-[var(--color-muted)]`}>
              {variantStockTotal} (somme)
            </span>
          ) : (
            <input
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={field}
            />
          )}
        </label>
      </div>

      {/* Déclinaisons */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Déclinaisons (taille, couleur…)</span>
          <button
            type="button"
            onClick={() =>
              setVariants((l) => [...l, { label: '', sku: '', priceAmount: '', stock: '0' }])
            }
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1 text-xs"
          >
            + Ajouter
          </button>
        </div>
        {hasVariants ? (
          <div className="flex flex-col gap-2">
            {variants.map((v, i) => (
              <div
                key={v.id ?? i}
                className="grid grid-cols-[1fr_84px_96px_32px] items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] p-2"
              >
                <input
                  placeholder="Ex. Rouge / M"
                  value={v.label}
                  onChange={(e) => setV(i, { label: e.target.value })}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
                />
                <input
                  inputMode="numeric"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => setV(i, { stock: e.target.value.replace(/\D/g, '') })}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-right text-sm tabular-nums"
                />
                <input
                  inputMode="numeric"
                  placeholder="Prix"
                  title="Prix propre à la déclinaison (vide = prix du produit)"
                  value={v.priceAmount}
                  onChange={(e) => setV(i, { priceAmount: e.target.value.replace(/\D/g, '') })}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-right text-sm tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setVariants((l) => l.filter((_, idx) => idx !== i))}
                  aria-label="Retirer la déclinaison"
                  className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs hover:bg-[var(--color-danger)] hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
            <p className="text-xs text-[var(--color-muted)]">
              Le stock du produit devient la somme des stocks de déclinaison. Prix
              vide = prix du produit.
            </p>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            Aucune déclinaison : le produit se vend en une seule version.
          </p>
        )}
      </div>

      <div className="text-sm flex flex-col gap-2">
        <span>Images</span>
        <div className="flex flex-wrap gap-2">
          {images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={src} className="relative">
              <img
                src={src}
                alt=""
                className="h-20 w-20 object-cover rounded-md border border-[var(--color-border)]"
              />
              <button
                type="button"
                onClick={() => setImages((s) => s.filter((x) => x !== src))}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[var(--color-danger)] text-white text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="text-xs"
        />
        {uploading ? <span className="text-xs text-[var(--color-muted)]">Téléversement…</span> : null}
      </div>

      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      {saved ? <p className="text-sm text-[var(--color-good)]">✓ Modifications enregistrées.</p> : null}

      <button
        disabled={busy || uploading}
        className="self-start rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le produit'}
      </button>
    </form>
  );
}
