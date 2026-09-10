'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patch, post } from '@/lib/client';
import { VERTICALS, type Product } from '@/lib/types';

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
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    const payload = {
      name,
      category,
      description,
      price: { amount: Number(price), currency: 'XOF' },
      compareAtPrice: compareAt ? { amount: Number(compareAt), currency: 'XOF' } : null,
      stock: Number(stock),
      images,
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
        // Pas de router.refresh() ici : appelé juste après router.push(), il
        // interrompt la navigation en cours (la page de destination récupère
        // de toute façon des données fraîches).
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
          <input
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={field}
          />
        </label>
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
