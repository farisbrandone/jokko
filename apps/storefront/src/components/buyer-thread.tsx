'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Message } from '@jokko/contracts';

export function BuyerThread({
  id,
  token,
  initial,
}: {
  id: string;
  token: string;
  initial: Message[];
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
      const res = await fetch(
        `/api/conversations/${id}?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      if (res.ok) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), sender: 'buyer', body, createdAt: new Date().toISOString() },
        ]);
        setBody('');
        router.refresh();
      }
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
              m.sender === 'buyer'
                ? 'self-end bg-[var(--color-brand-soft)]'
                : 'self-start bg-[var(--color-surface-2)]'
            }`}
          >
            {m.body}
          </li>
        ))}
      </ul>
      <form onSubmit={send} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Votre message…"
          className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 text-sm font-medium"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
