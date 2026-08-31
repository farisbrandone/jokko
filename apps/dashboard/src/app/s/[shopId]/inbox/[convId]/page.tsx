import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiJson, ApiError } from '@/lib/api';
import { Shell } from '@/components/shell';
import { InboxThread } from '@/components/inbox-thread';

export const dynamic = 'force-dynamic';

interface Thread {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  productName: string | null;
  status: 'open' | 'closed';
  messages: { id: string; sender: 'buyer' | 'seller'; body: string; createdAt: string }[];
}

type Params = { params: Promise<{ shopId: string; convId: string }> };

export default async function InboxThreadPage({ params }: Params) {
  const { shopId, convId } = await params;

  let thread: Thread;
  try {
    thread = await apiJson<Thread>(`/shops/${shopId}/inbox/${convId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login');
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) notFound();
    throw e;
  }

  return (
    <Shell>
      <Link href={`/s/${shopId}/inbox`} className="text-sm text-[var(--color-muted)]">
        ← Boîte de réception
      </Link>
      <div className="my-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          {thread.buyerName}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {thread.buyerPhone}
          {thread.buyerEmail ? ` · ${thread.buyerEmail}` : ''}
          {thread.productName ? ` · ${thread.productName}` : ''}
        </p>
      </div>
      <InboxThread
        shopId={shopId}
        convId={convId}
        initial={thread.messages}
        status={thread.status}
      />
    </Shell>
  );
}
