import Link from 'next/link';
import { whatsappLink } from '@jokko/ui';
import type { ShopView } from '@/lib/api';
import { SearchBox } from './search-box';

export function SiteHeader({ shop }: { shop: ShopView | null }) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] font-bold text-lg shrink-0"
        >
          {shop?.name ?? 'Jokko'}
        </Link>
        <div className="flex-1 max-w-md">
          <SearchBox />
        </div>
        {shop?.whatsapp ? (
          <a
            href={whatsappLink(shop.whatsapp, `Bonjour ${shop.name}, `)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-2 text-sm font-medium"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
    </header>
  );
}
