'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomDomainStatus } from '@jokko/contracts';
import { Badge, Button } from '@jokko/ui';
import { bffGet, bffSend } from '@/lib/bff';

function Dns({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
      <span className="w-16 shrink-0 text-[var(--color-muted)]">{label}</span>
      <code className="break-all rounded bg-[var(--color-surface-2)] px-1.5 py-0.5">{value}</code>
    </div>
  );
}

export function CustomDomainForm({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const base = `/api/proxy/shops/${shopId}/domain`;
  const [domain, setDomain] = useState('');

  const status = useQuery({
    queryKey: ['domain', shopId],
    queryFn: () => bffGet<CustomDomainStatus>(base),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['domain', shopId] });

  const save = useMutation({
    mutationFn: () => bffSend<CustomDomainStatus>(base, 'POST', { domain: domain.trim() }),
    onSuccess: () => {
      setDomain('');
      invalidate();
    },
  });
  const verify = useMutation({
    mutationFn: () => bffSend<CustomDomainStatus>(`${base}/verify`, 'POST'),
    onSuccess: invalidate,
  });
  const clear = useMutation({
    mutationFn: () => bffSend(base, 'DELETE'),
    onSuccess: invalidate,
  });

  const err =
    (save.error as Error | null)?.message ?? (verify.error as Error | null)?.message ?? null;
  const st = status.data;

  return (
    <div className="max-w-lg flex flex-col gap-3">
      {!st || st.domain === null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input
            required
            placeholder="boutique.mondomaine.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="min-w-[240px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? '…' : 'Enregistrer'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">{st.domain}</span>
            {st.verified ? (
              <Badge tone="good">actif</Badge>
            ) : (
              <Badge tone="neutral">en attente de vérification</Badge>
            )}
          </div>

          {st.verification ? (
            <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-2">
              <p className="text-xs text-[var(--color-muted)]">
                Chez votre hébergeur DNS, créez ces deux enregistrements :
              </p>
              <Dns label="CNAME" value={`${st.domain} → ${st.verification.cnameTarget}`} />
              <Dns
                label="TXT"
                value={`${st.verification.recordName} → ${st.verification.recordValue}`}
              />
            </div>
          ) : null}

          <div className="flex gap-2">
            {!st.verified ? (
              <Button size="sm" onClick={() => verify.mutate()} disabled={verify.isPending}>
                {verify.isPending ? '…' : 'Vérifier'}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => clear.mutate()}
              disabled={clear.isPending}
            >
              Retirer
            </Button>
          </div>
        </div>
      )}
      {err ? <p className="text-xs text-[var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
