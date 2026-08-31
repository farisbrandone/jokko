import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';

export const dynamic = 'force-dynamic';

interface Conversation {
  id: string;
  buyerName: string;
  buyerPhone: string;
  productName: string | null;
  status: 'open' | 'closed';
  lastMessageAt: string;
}
interface ConversationList {
  items: Conversation[];
  total: number;
}

type Params = {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function InboxPage({ params, searchParams }: Params) {
  const { shopId } = await params;
  const status = (await searchParams).status;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  const list = await apiJson<ConversationList>(
    `/shops/${shopId}/inbox?pageSize=100${status ? `&status=${status}` : ''}`,
  );

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
            ← Boutique
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Boîte de réception
          </h1>
        </div>
        <div className="flex gap-2 text-sm">
          {(['', 'open', 'closed'] as const).map((s) => (
            <Link
              key={s || 'all'}
              href={`/s/${shopId}/inbox${s ? `?status=${s}` : ''}`}
              className={`rounded-[var(--radius-btn)] border px-2.5 py-1 ${
                (status ?? '') === s
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {s === '' ? 'Toutes' : s === 'open' ? 'Ouvertes' : 'Closes'}
            </Link>
          ))}
        </div>
      </div>

      {list.items.length === 0 ? (
        <p className="text-[var(--color-muted)] py-10 text-center">Aucune conversation.</p>
      ) : (
        <ul className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
          {list.items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/s/${shopId}/inbox/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.buyerName}{' '}
                    <span className="text-[var(--color-faint)] font-normal">{c.buyerPhone}</span>
                  </p>
                  <p className="text-sm text-[var(--color-muted)] truncate">
                    {c.productName ?? 'Sans produit'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                    c.status === 'open'
                      ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-faint)]'
                  }`}
                >
                  {c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
