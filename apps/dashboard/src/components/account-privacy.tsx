'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button, buttonStyles } from '@jokko/ui';
import { bffSend } from '@/lib/bff';

export function AccountPrivacy() {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');

  const remove = useMutation({
    mutationFn: () => bffSend<{ deleted: boolean }>('/api/account', 'DELETE'),
    onSuccess: () => {
      router.push('/login');
      router.refresh();
    },
  });
  const busy = remove.isPending;
  const msg = remove.error ? (remove.error as Error).message : null;

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <section>
        <h2 className="font-medium mb-1">Exporter mes données</h2>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          Archive JSON de votre profil, vos boutiques, vos sessions et vos échanges
          en tant qu&apos;acheteur.
        </p>
        <a href="/api/account/export" style={buttonStyles({ variant: 'secondary' })}>
          Télécharger l&apos;archive
        </a>
      </section>

      <section>
        <h2 className="font-medium mb-1 text-[var(--color-danger,#b91c1c)]">
          Supprimer mon compte
        </h2>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          Action définitive. Impossible si vous êtes encore propriétaire d&apos;une
          boutique : transférez ou supprimez-la d&apos;abord. Tapez{' '}
          <strong>SUPPRIMER</strong> pour confirmer.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mb-2 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder="SUPPRIMER"
        />
        <Button
          type="button"
          variant="danger"
          onClick={() => remove.mutate()}
          disabled={busy || confirm !== 'SUPPRIMER'}
        >
          Supprimer définitivement
        </Button>
        {msg ? <p className="mt-2 text-xs text-[var(--color-danger,#b91c1c)]">{msg}</p> : null}
      </section>
    </div>
  );
}
