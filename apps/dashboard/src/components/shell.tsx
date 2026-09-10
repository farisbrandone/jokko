'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { post } from '@/lib/client';
import { LegalLinks } from './legal-links';
import {
  IconBox,
  IconCard,
  IconChart,
  IconChat,
  IconLogout,
  IconOrders,
  IconSettings,
  IconShops,
  IconStar,
  IconTag,
  IconUser,
  IconUsers,
  type IconProps,
} from './nav-icons';

interface NavItem {
  href: string;
  label: string;
  short: string;
  Icon: (p: IconProps) => React.ReactElement;
  exact?: boolean;
  matchPrefix?: string;
}

function shopNav(id: string): NavItem[] {
  const b = `/s/${id}`;
  return [
    { href: b, label: 'Produits', short: 'Produits', Icon: IconBox, exact: true, matchPrefix: `${b}/products` },
    { href: `${b}/orders`, label: 'Commandes', short: 'Cmdes', Icon: IconOrders },
    { href: `${b}/inbox`, label: 'Messages', short: 'Messages', Icon: IconChat },
    { href: `${b}/analytics`, label: 'Statistiques', short: 'Stats', Icon: IconChart },
    { href: `${b}/settings`, label: 'Réglages', short: 'Réglages', Icon: IconSettings },
    { href: `${b}/discounts`, label: 'Codes promo', short: 'Promos', Icon: IconTag },
    { href: `${b}/reviews`, label: 'Avis', short: 'Avis', Icon: IconStar },
    { href: `${b}/team`, label: 'Équipe', short: 'Équipe', Icon: IconUsers },
    { href: `${b}/billing`, label: 'Abonnement', short: 'Abo.', Icon: IconCard },
  ];
}

const ROOT_NAV: NavItem[] = [
  { href: '/', label: 'Boutiques', short: 'Boutiques', Icon: IconShops, exact: true },
  { href: '/account', label: 'Mon compte', short: 'Compte', Icon: IconUser },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Shell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const shopId = pathname.match(/^\/s\/([^/]+)/)?.[1] ?? null;
  const nav = shopId ? shopNav(shopId) : ROOT_NAV;
  const mobileNav = nav.slice(0, 5);

  const logout = async () => {
    await post('/api/auth/logout');
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink)] lg:pl-60">
      {/* Barre latérale — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-4 font-[family-name:var(--font-display)] text-lg font-bold"
        >
          Jokko
          <span className="text-xs font-normal text-[var(--color-muted)]">vendeur</span>
        </Link>
        {shopId ? (
          <Link
            href="/"
            className="mx-3 mb-2 flex items-center gap-2 rounded-[var(--radius-btn)] px-2 py-1.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            <IconShops className="h-4 w-4" /> Toutes les boutiques
          </Link>
        ) : null}
        <nav className="flex-1 overflow-y-auto px-3 py-1">
          <ul className="flex flex-col gap-0.5">
            {nav.map((it) => {
              const active = isActive(pathname, it);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-[var(--radius-btn)] px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[var(--color-brand-soft)] font-medium text-[var(--color-ink)]'
                        : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <it.Icon className={active ? 'text-[var(--color-brand)]' : undefined} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-[var(--color-border)] px-3 py-3">
          {email ? (
            <p className="mb-2 truncate px-2 text-xs text-[var(--color-muted)]" title={email}>
              {email}
            </p>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
          >
            <IconLogout /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* Barre supérieure — mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:hidden">
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold">
          Jokko <span className="text-xs font-normal text-[var(--color-muted)]">vendeur</span>
        </Link>
        <button
          type="button"
          onClick={logout}
          aria-label="Se déconnecter"
          className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
        >
          <IconLogout />
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:pb-10">
        {children}
        <div className="mt-10 hidden border-t border-[var(--color-border)] pt-4 lg:block">
          <LegalLinks />
        </div>
      </main>

      {/* Barre d'onglets — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden">
        {mobileNav.map((it) => {
          const active = isActive(pathname, it);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? 'text-[var(--color-brand)]' : 'text-[var(--color-muted)]'
              }`}
            >
              <it.Icon className="h-5 w-5" />
              {it.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
