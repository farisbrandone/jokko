import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Message } from '@jokko/contracts';
import { currentShop } from '@/lib/shop';
import { apiBase } from '@/lib/api';
import { BuyerThread } from '@/components/buyer-thread';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Votre conversation', robots: { index: false } };
}

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

interface ThreadView {
  id: string;
  buyerName: string;
  status: string;
  productName: string | null;
  messages: Message[];
}

export default async function BuyerConversationPage({ params, searchParams }: Params) {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;

  const { id } = await params;
  const token = (await searchParams).token ?? '';
  if (!token) notFound();

  const res = await fetch(
    `${apiBase}/shops/${shop.id}/conversations/${id}?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) notFound();
  const thread = (await res.json()) as ThreadView;

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">
        Conversation avec {shop.name}
        {thread.productName ? (
          <span className="block text-sm font-normal text-[var(--color-muted)]">
            À propos de {thread.productName}
          </span>
        ) : null}
      </h1>
      <BuyerThread id={id} token={token} initial={thread.messages} />
      {thread.status === 'closed' ? (
        <p className="text-xs text-[var(--color-muted)]">
          Conversation clôturée par le vendeur.
        </p>
      ) : null}
    </div>
  );
}
