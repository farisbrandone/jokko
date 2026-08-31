'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatMoney } from '@jokko/ui';
import type { SearchHit } from '@jokko/contracts';

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}&pageSize=6`,
          { signal: ctrl.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { items: SearchHit[] };
          setHits(data.items);
          setOpen(true);
        }
      } catch {
        /* annulé */
      }
    }, 180);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div ref={box} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          setOpen(false);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          placeholder="Rechercher un produit…"
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          aria-label="Rechercher"
        />
      </form>
      {open && hits.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
          {hits.map((h) => (
            <li key={h.id}>
              <Link
                href={`/p/${h.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
              >
                <span className="line-clamp-1">{h.name}</span>
                <span className="shrink-0 text-[var(--color-muted)]">
                  {formatMoney(h.priceAmount, h.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
