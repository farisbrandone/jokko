import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface Props {
  basePath: string;
  facets: Record<string, Record<string, number>>;
  activeCategory?: string;
}

export async function Facets({ basePath, facets, activeCategory }: Props) {
  const categories = facets.category ?? {};
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const t = await getTranslations('facets');

  return (
    <nav className="text-sm">
      <p className="font-medium mb-2">{t('categories')}</p>
      <ul className="flex flex-col gap-1">
        {entries.map(([name, count]) => {
          const active = name === activeCategory;
          return (
            <li key={name}>
              <Link
                href={active ? basePath : `/c/${encodeURIComponent(name)}`}
                className={`flex justify-between gap-2 rounded px-2 py-1 ${
                  active
                    ? 'bg-[var(--color-brand-soft)] font-medium'
                    : 'hover:bg-[var(--color-surface-2)]'
                }`}
              >
                <span className="capitalize">{name.replace(/-/g, ' ')}</span>
                <span className="text-[var(--color-faint)]">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
