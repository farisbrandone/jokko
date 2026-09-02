import Link from 'next/link';
import type { InvitePreview } from '@jokko/contracts';
import { apiBase, apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { AcceptInvite } from '@/components/accept-invite';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  owner: 'propriétaire',
  admin: 'administrateur',
  staff: 'équipier',
  viewer: 'observateur',
};

type Params = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Params) {
  const { token } = await params;

  const res = await fetch(`${apiBase}/invitations/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  const preview = res.ok ? ((await res.json()) as InvitePreview) : null;

  let me: SessionUser | null = null;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    me = null;
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-bg)] text-[var(--color-ink)] p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">Invitation</h1>

        {!preview ? (
          <p className="text-sm text-[var(--color-muted)]">
            Cette invitation est introuvable ou a été révoquée.
          </p>
        ) : preview.expired ? (
          <p className="text-sm text-[var(--color-muted)]">
            Cette invitation a expiré. Demandez à en recevoir une nouvelle.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {preview.invitedByName ? `${preview.invitedByName} vous invite` : 'Vous êtes invité·e'} à
              rejoindre <strong>{preview.shopName}</strong> en tant que{' '}
              <strong>{ROLE_LABEL[preview.role] ?? preview.role}</strong>.
            </p>
            {me ? (
              me.email.toLowerCase() === preview.email.toLowerCase() ? (
                <AcceptInvite token={token} />
              ) : (
                <p className="text-sm text-[var(--color-danger)]">
                  Cette invitation a été envoyée à {preview.email}. Connectez-vous avec ce compte
                  pour l&apos;accepter.
                </p>
              )
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="text-sm underline"
              >
                Connectez-vous avec {preview.email} pour accepter
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
