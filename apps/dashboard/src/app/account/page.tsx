import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { AccountPrivacy } from '@/components/account-privacy';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }

  return (
    <Shell email={me.email}>
      <div className="mb-6">
        <Link href="/" className="text-sm text-[var(--color-muted)]">
          ← Vos boutiques
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Mon compte</h1>
        <p className="text-sm text-[var(--color-muted)]">{me.email}</p>
      </div>
      <AccountPrivacy />
    </Shell>
  );
}
