'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Review, ReviewStatus } from '@jokko/contracts';
import { Badge, Button } from '@jokko/ui';
import { bffGet, bffSend } from '@/lib/bff';

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'pending', label: 'En attente' },
  { key: 'published', label: 'Publiés' },
  { key: 'rejected', label: 'Rejetés' },
];

export function ReviewModeration({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const base = `/api/proxy/shops/${shopId}/reviews`;
  const [tab, setTab] = useState<ReviewStatus>('pending');

  const list = useQuery({
    queryKey: ['reviews', shopId, tab],
    queryFn: () => bffGet<Review[]>(`${base}?status=${tab}`),
  });

  const moderate = useMutation({
    mutationFn: (v: { id: string; action: 'publish' | 'reject' }) =>
      bffSend(`${base}/${v.id}/moderate`, 'POST', { action: v.action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', shopId] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 text-sm">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`rounded-[var(--radius-btn)] px-3 py-1 ${
              tab === tb.key
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {(list.data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Aucun avis dans cette file.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(list.data ?? []).map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-brand)]">{'★'.repeat(r.rating)}</span>
                <span className="font-medium">{r.authorName}</span>
                <Badge
                  tone={
                    r.status === 'published' ? 'good' : r.status === 'rejected' ? 'danger' : 'neutral'
                  }
                >
                  {r.status}
                </Badge>
              </div>
              {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
              <p className="mt-1 whitespace-pre-line">{r.body}</p>
              <div className="mt-2 flex gap-2">
                {r.status !== 'published' ? (
                  <Button
                    size="sm"
                    onClick={() => moderate.mutate({ id: r.id, action: 'publish' })}
                    disabled={moderate.isPending}
                  >
                    Publier
                  </Button>
                ) : null}
                {r.status !== 'rejected' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => moderate.mutate({ id: r.id, action: 'reject' })}
                    disabled={moderate.isPending}
                  >
                    Rejeter
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
