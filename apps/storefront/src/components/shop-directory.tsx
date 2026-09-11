import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { DirectoryResult } from '@jokko/contracts';
import { siteUrl } from '@/lib/shop';
import { VerifiedBadge } from './verified-badge';

const VERTICALS: Record<string, string> = {
  electronique: 'Électronique',
  'mode-accessoires': 'Mode & accessoires',
  'maison-cuisine': 'Maison & cuisine',
  'beaute-soin': 'Beauté & soin',
  sport: 'Sport',
};

/** URL publique d'une boutique = <slug>.<hôte apex courant>. */
function shopUrl(apex: string, slug: string): string {
  return apex.replace('://', `://${slug}.`);
}

export async function ShopDirectory({
  data,
  query,
}: {
  data: DirectoryResult;
  query: { q?: string; vertical?: string };
}) {
  const t = await getTranslations('directory');
  const apex = await siteUrl();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-soft)] px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-[var(--color-muted)]">{t('subtitle')}</p>
      </section>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query.q ?? ''}
          placeholder={t('searchPlaceholder')}
          className="min-w-[200px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <select
          name="vertical"
          defaultValue={query.vertical ?? ''}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">{t('allVerticals')}</option>
          {Object.entries(VERTICALS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)]"
        >
          {t('search')}
        </button>
      </form>

      {data.items.length === 0 ? (
        <p className="py-10 text-center text-[var(--color-muted)]">{t('empty')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((s) => (
            <li key={s.slug}>
              <a
                href={shopUrl(apex, s.slug)}
                className="block h-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full"
                    style={{ background: s.brandColor ?? 'var(--color-brand)' }}
                  />
                  <span className="font-medium">{s.name}</span>
                  {s.verified ? <VerifiedBadge /> : null}
                </div>
                {s.tagline ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{s.tagline}</p>
                ) : null}
                <p className="mt-2 text-xs text-[var(--color-faint)]">
                  {s.verticals.map((v) => VERTICALS[v] ?? v).join(' · ')}
                  {' — '}
                  {t('productsCount', { count: s.products })}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
