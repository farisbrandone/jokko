'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@jokko/ui';
import type { ProductSearchResult, SearchHit } from '@jokko/contracts';

type Filters = {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
};

type Preset = 'grid' | 'editorial' | 'single' | 'dense';

interface Props {
  initial: ProductSearchResult;
  currency: string;
  initialParams: Filters;
  /** Catégories déclarées par la boutique, fusionnées avec les facettes. */
  shopCategories?: string[];
  /** Disposition de la vitrine choisie par le vendeur. */
  preset?: string;
}

const SORTS = ['relevance', 'newest', 'price_asc', 'price_desc'] as const;

const PRESETS: readonly Preset[] = ['grid', 'editorial', 'single', 'dense'];
const asPreset = (v: string | undefined): Preset =>
  PRESETS.includes(v as Preset) ? (v as Preset) : 'grid';

const GRID_CLASS: Record<Preset, string> = {
  grid: 'grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
  dense: 'grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6',
  editorial: 'grid-cols-1 gap-5 sm:grid-cols-2',
  single: 'grid-cols-1 gap-3',
};

function buildQuery(f: Filters, page: number, pageSize: number): string {
  const qs = new URLSearchParams();
  if (f.q) qs.set('q', f.q);
  if (f.category) qs.set('category', f.category);
  if (f.minPrice) qs.set('minPrice', f.minPrice);
  if (f.maxPrice) qs.set('maxPrice', f.maxPrice);
  if (f.inStock) qs.set('inStock', 'true');
  if (f.sort && f.sort !== 'relevance') qs.set('sort', f.sort);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  return qs.toString();
}

function activeCount(f: Filters): number {
  return (
    (f.category ? 1 : 0) +
    (f.minPrice || f.maxPrice ? 1 : 0) +
    (f.inStock ? 1 : 0) +
    (f.sort && f.sort !== 'relevance' ? 1 : 0)
  );
}

function discount(hit: SearchHit): number {
  return Math.round(100 - (hit.priceAmount / (hit.compareAtPriceAmount as number)) * 100);
}

function Card({ hit, label, preset }: { hit: SearchHit; label: string; preset: Preset }) {
  const img = hit.images[0];
  const promo = hit.compareAtPriceAmount != null && hit.compareAtPriceAmount > hit.priceAmount;
  const horizontal = preset === 'single';
  const compact = preset === 'dense';

  const badges = (
    <>
      {!hit.inStock ? (
        <span className="absolute left-2 top-2 rounded bg-[var(--color-ink)]/80 px-2 py-0.5 text-[11px] text-white">
          {label}
        </span>
      ) : null}
      {promo ? (
        <span className="absolute right-2 top-2 rounded bg-[var(--color-danger)] px-2 py-0.5 text-[11px] font-medium text-white">
          −{discount(hit)}%
        </span>
      ) : null}
    </>
  );

  const price = (
    <p className={compact ? 'mt-1 text-xs' : 'mt-1 text-sm'}>
      <span className="font-semibold">{formatMoney(hit.priceAmount, hit.currency)}</span>
      {promo ? (
        <span className="ml-2 text-[var(--color-faint)] line-through">
          {formatMoney(hit.compareAtPriceAmount as number, hit.currency)}
        </span>
      ) : null}
    </p>
  );

  return (
    <Link
      href={`/p/${hit.slug}`}
      className={`group overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-md ${
        horizontal ? 'flex gap-3' : 'block'
      }`}
    >
      <div
        className={`relative shrink-0 bg-[var(--color-surface-2)] ${
          horizontal ? 'aspect-square w-28 sm:w-36' : 'aspect-square'
        }`}
      >
        {img ? (
          <Image
            src={img}
            alt={hit.name}
            fill
            sizes={horizontal ? '160px' : '(max-width:640px) 50vw, 25vw'}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : null}
        {badges}
      </div>
      <div className={`${compact ? 'p-2' : 'p-3'} ${horizontal ? 'flex flex-1 flex-col justify-center' : ''}`}>
        <p className={`line-clamp-2 font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{hit.name}</p>
        {preset === 'editorial' && hit.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{hit.description}</p>
        ) : null}
        {price}
      </div>
    </Link>
  );
}

function SkeletonCard({ preset }: { preset: Preset }) {
  const horizontal = preset === 'single';
  return (
    <div
      className={`animate-pulse overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] ${
        horizontal ? 'flex gap-3' : 'block'
      }`}
    >
      <div
        className={`shrink-0 bg-[var(--color-surface-2)] ${
          horizontal ? 'aspect-square w-28 sm:w-36' : 'aspect-square'
        }`}
      />
      <div className="flex-1 p-3">
        <div className="h-3 w-4/5 rounded bg-[var(--color-surface-2)]" />
        <div className="mt-2 h-3 w-1/3 rounded bg-[var(--color-surface-2)]" />
      </div>
    </div>
  );
}

export function ProductBrowser({
  initial,
  initialParams,
  shopCategories = [],
  preset,
}: Props) {
  const layout = asPreset(preset);
  const t = useTranslations('browse');
  const tp = useTranslations('product');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(initialParams);
  const [items, setItems] = useState<SearchHit[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [facets, setFacets] = useState(initial.facets);
  const pageSize = initial.pageSize || 24;
  const pageRef = useRef(1);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const firstRun = useRef(true);

  const [priceDraft, setPriceDraft] = useState({
    min: initialParams.minPrice ?? '',
    max: initialParams.maxPrice ?? '',
  });

  const categories = useMemo(() => {
    const fromFacets = Object.keys(facets.category ?? {});
    const set = new Set<string>([...shopCategories, ...fromFacets]);
    if (filters.category) set.add(filters.category);
    return [...set].sort((a, b) => (facets.category?.[b] ?? 0) - (facets.category?.[a] ?? 0));
  }, [facets, shopCategories, filters.category]);

  const load = useCallback(
    async (f: Filters, page: number, append: boolean) => {
      append ? setMore(true) : setBusy(true);
      try {
        const res = await fetch(`/api/search?${buildQuery(f, page, pageSize)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as ProductSearchResult;
        pageRef.current = page;
        setTotal(data.total);
        if (!append) setFacets(data.facets);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      } finally {
        append ? setMore(false) : setBusy(false);
      }
    },
    [pageSize],
  );

  // Filtres → URL + rechargement page 1 (on saute le tout premier rendu SSR).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const qs = buildQuery(filters, 1, pageSize).replace(/&?page=1&pageSize=\d+/, '');
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    void load(filters, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Défilement infini.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !busy &&
          !more &&
          items.length < total
        ) {
          void load(filters, pageRef.current + 1, true);
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [busy, more, items.length, total, filters, load]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => {
    setPriceDraft({ min: '', max: '' });
    setFilters((f) => ({ q: f.q, sort: 'relevance' }));
  };
  const commitPrice = () =>
    set({
      minPrice: priceDraft.min || undefined,
      maxPrice: priceDraft.max || undefined,
    });

  const n = activeCount(filters);
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
      active
        ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
        : 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]'
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Chips catégories */}
      {categories.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => set({ category: undefined })}
            className={chip(!filters.category)}
          >
            {t('all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => set({ category: filters.category === cat ? undefined : cat })}
              className={`${chip(filters.category === cat)} capitalize`}
            >
              {cat.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      ) : null}

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.sort ?? 'relevance'}
          onChange={(e) => set({ sort: e.target.value })}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          aria-label={t('sort')}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(
                s === 'relevance'
                  ? 'sortRelevance'
                  : s === 'newest'
                    ? 'sortNewest'
                    : s === 'price_asc'
                      ? 'sortPriceAsc'
                      : 'sortPriceDesc',
              )}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
        >
          {t('filters')}
          {n > 0 ? (
            <span className="ml-1.5 rounded-full bg-[var(--color-brand)] px-1.5 text-xs text-[var(--color-brand-ink)]">
              {n}
            </span>
          ) : null}
        </button>

        <span className="ml-auto text-sm text-[var(--color-muted)]">
          {t('results', { count: total })}
        </span>
        {n > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-[var(--color-brand)] hover:underline"
          >
            {t('clear')}
          </button>
        ) : null}
      </div>

      {panelOpen ? (
        <div className="flex flex-wrap items-end gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <fieldset className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-muted)]">{t('priceRange')}</span>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={priceDraft.min}
                onChange={(e) => setPriceDraft((p) => ({ ...p, min: e.target.value.replace(/\D/g, '') }))}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
                placeholder={t('priceMin')}
                className="w-24 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
              />
              <span className="text-[var(--color-faint)]">–</span>
              <input
                inputMode="numeric"
                value={priceDraft.max}
                onChange={(e) => setPriceDraft((p) => ({ ...p, max: e.target.value.replace(/\D/g, '') }))}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
                placeholder={t('priceMax')}
                className="w-24 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
              />
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!filters.inStock}
              onChange={(e) => set({ inStock: e.target.checked || undefined })}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            {t('inStockOnly')}
          </label>
        </div>
      ) : null}

      {/* Résultats */}
      {busy ? (
        <div className={`grid ${GRID_CLASS[layout]}`}>
          {Array.from({ length: layout === 'dense' ? 12 : 8 }).map((_, i) => (
            <SkeletonCard key={i} preset={layout} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-[var(--color-muted)]">{t('empty')}</p>
      ) : (
        <div className={`grid ${GRID_CLASS[layout]}`}>
          {items.map((h) => (
            <Card key={h.id} hit={h} label={tp('outOfStock')} preset={layout} />
          ))}
          {more
            ? Array.from({ length: layout === 'single' ? 2 : 3 }).map((_, i) => (
                <SkeletonCard key={`s${i}`} preset={layout} />
              ))
            : null}
        </div>
      )}

      <div ref={sentinel} className="h-6" />
      {more ? (
        <p className="py-4 text-center text-sm text-[var(--color-muted)]">{t('loadingMore')}</p>
      ) : items.length > 0 && items.length >= total ? (
        <p className="py-4 text-center text-sm text-[var(--color-faint)]">{t('end')}</p>
      ) : null}
    </div>
  );
}
