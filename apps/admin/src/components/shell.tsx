'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
import { post } from '@/lib/client';

const nav = [
  { href: '/', label: "Vue d'ensemble" },
  { href: '/shops', label: 'Boutiques' },
  { href: '/reports', label: 'Signalements' },
];

export function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
          <span className="font-[family-name:var(--font-display)] font-bold">Jokko · plateforme</span>
          <nav className="flex gap-1 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-[var(--radius-btn)] px-2.5 py-1 ${
                  path === n.href
                    ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                    : 'hover:bg-[var(--color-surface-2)]'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {email ? <span className="text-[var(--color-muted)]">{email}</span> : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                await post('/api/auth/logout');
                router.push('/login');
                router.refresh();
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
