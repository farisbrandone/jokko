import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (me.memberships.length === 0) redirect('/onboarding');

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Vos boutiques
        </h1>
        <Link
          href="/onboarding"
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-2 text-sm font-medium"
        >
          Nouvelle boutique
        </Link>
      </div>
      <ul className="grid sm:grid-cols-2 gap-3">
        {me.memberships.map((m) => (
          <li key={m.shopId}>
            <Link
              href={`/s/${m.shopId}`}
              className="block rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <p className="font-medium">{m.slug}</p>
              <p className="text-sm text-[var(--color-muted)] capitalize">{m.role}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
