'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Invitation, InvitableRole, Member, ShopRole } from '@jokko/contracts';
import { Badge, Button } from '@jokko/ui';
import { bffGet, bffSend } from '@/lib/bff';

const ROLE_LABEL: Record<ShopRole, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  staff: 'Équipier',
  viewer: 'Observateur',
};

export function TeamManager({ shopId, canManage }: { shopId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const base = `/api/proxy/shops/${shopId}/members`;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('staff');

  const members = useQuery({
    queryKey: ['team', shopId, 'members'],
    queryFn: () => bffGet<Member[]>(base),
  });
  const invites = useQuery({
    queryKey: ['team', shopId, 'invitations'],
    queryFn: () => bffGet<Invitation[]>(`${base}/invitations`),
    enabled: canManage,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['team', shopId] });

  const invite = useMutation({
    mutationFn: () => bffSend(`${base}/invitations`, 'POST', { email: email.trim(), role }),
    onSuccess: () => {
      setEmail('');
      invalidate();
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => bffSend(`${base}/invitations/${id}`, 'DELETE'),
    onSuccess: invalidate,
  });
  const changeRole = useMutation({
    mutationFn: (v: { userId: string; role: ShopRole }) =>
      bffSend(`${base}/${v.userId}`, 'PATCH', { role: v.role }),
    onSuccess: invalidate,
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => bffSend(`${base}/${userId}`, 'DELETE'),
    onSuccess: invalidate,
  });

  const err =
    (invite.error as Error | null)?.message ??
    (changeRole.error as Error | null)?.message ??
    (removeMember.error as Error | null)?.message ??
    null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-medium mb-3">Membres</h2>
        <ul className="flex flex-col gap-2">
          {(members.data ?? []).map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <span>
                {m.name} <span className="text-[var(--color-muted)]">· {m.email}</span>
                {m.isSelf ? <span className="text-[var(--color-muted)]"> · vous</span> : null}
              </span>
              <span className="flex items-center gap-2">
                {canManage && !m.isSelf ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      changeRole.mutate({ userId: m.userId, role: e.target.value as ShopRole })
                    }
                    className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
                  >
                    {(['owner', 'admin', 'staff', 'viewer'] as ShopRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>{ROLE_LABEL[m.role]}</Badge>
                )}
                {canManage && !m.isSelf ? (
                  <button
                    type="button"
                    onClick={() => removeMember.mutate(m.userId)}
                    className="text-xs text-[var(--color-danger)] underline"
                  >
                    Retirer
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage ? (
        <section>
          <h2 className="font-medium mb-3">Inviter un membre</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <input
              required
              type="email"
              placeholder="adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-[220px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="staff">Équipier</option>
              <option value="viewer">Observateur</option>
            </select>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? '…' : 'Envoyer'}
            </Button>
          </form>
          {err ? <p className="mt-2 text-xs text-[var(--color-danger)]">{err}</p> : null}

          {(invites.data ?? []).length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {(invites.data ?? []).map((iv) => (
                <li
                  key={iv.id}
                  className="flex items-center justify-between rounded-[var(--radius-btn)] border border-dashed border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <span>
                    {iv.email} <span className="text-[var(--color-muted)]">· {ROLE_LABEL[iv.role]}</span>
                    <span className="text-[var(--color-muted)]"> · en attente</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => revoke.mutate(iv.id)}
                    className="text-xs text-[var(--color-danger)] underline"
                  >
                    Annuler
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
