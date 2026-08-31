'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

interface Msg {
  id: string;
  sender: 'buyer' | 'seller';
  body: string;
  createdAt: string;
}

export function InboxThread({
  shopId,
  convId,
  initial,
  status,
}: {
  shopId: string;
  convId: string;
  initial: Msg[];
  status: 'open' | 'closed';
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await post(`/api/proxy/shops/${shopId}/inbox/${convId}/messages`, { body });
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), sender: 'seller', body, createdAt: new Date().toISOString() },
      ]);
      setBody('');
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    try {
      await post(`/api/proxy/shops/${shopId}/inbox/${convId}/close`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[80%] rounded-[var(--radius-card)] px-3 py-2 text-sm ${
              m.sender === 'seller'
                ? 'self-end bg-[var(--color-brand-soft)]'
                : 'self-start bg-[var(--color-surface-2)]'
            }`}
          >
            {m.body}
          </li>
        ))}
      </ul>

      {status === 'open' ? (
        <>
          <form onSubmit={send} className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Répondre…"
              className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <button
              disabled={busy}
              className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 text-sm font-medium"
            >
              Envoyer
            </button>
          </form>
          <button
            onClick={close}
            disabled={busy}
            className="self-start rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-xs"
          >
            Clôturer la conversation
          </button>
        </>
      ) : (
        <p className="text-xs text-[var(--color-muted)]">Conversation clôturée.</p>
      )}
    </div>
  );
}
