import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { NotificationSettings, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { NotificationSettingsForm } from '@/components/notification-settings-form';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

export default async function SettingsPage({ params }: Params) {
  const { shopId } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  const settings = await apiJson<NotificationSettings>(
    `/shops/${shopId}/settings/notifications`,
  );

  return (
    <Shell email={me.email}>
      <div className="mb-6">
        <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
          ← Boutique
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Notifications
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Comment être prévenu quand un acheteur écrit à la boutique.
        </p>
      </div>

      <NotificationSettingsForm shopId={shopId} initial={settings} />
    </Shell>
  );
}
