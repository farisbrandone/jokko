import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge, buttonStyles } from '@jokko/ui';
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
        <div className="flex items-center gap-3">
          <Link href="/account" className="text-sm text-[var(--color-muted)]">
            Mon compte
          </Link>
          <Link href="/onboarding" style={buttonStyles({ size: 'sm' })}>
            Nouvelle boutique
          </Link>
        </div>
      </div>
      <ul className="grid sm:grid-cols-2 gap-3">
        {me.memberships.map((m) => (
          <li key={m.shopId}>
            <Link
              href={`/s/${m.shopId}`}
              className="block rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <p className="font-medium">{m.slug}</p>
              <span className="mt-1 inline-block">
                <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>{m.role}</Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
