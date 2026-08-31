'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

export function Shell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-[family-name:var(--font-display)] font-bold">
            Jokko · vendeur
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {email ? <span className="text-[var(--color-muted)]">{email}</span> : null}
            <button
              type="button"
              onClick={async () => {
                await post('/api/auth/logout');
                router.push('/login');
                router.refresh();
              }}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
