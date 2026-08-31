import type { ShopView } from '@/lib/api';

export function SiteFooter({ shop }: { shop: ShopView | null }) {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-8">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-[var(--color-muted)] flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>{shop ? `${shop.name} — propulsé par Jokko` : 'Jokko'}</span>
        <span>{shop?.currency ?? 'XOF'}</span>
      </div>
    </footer>
  );
}
