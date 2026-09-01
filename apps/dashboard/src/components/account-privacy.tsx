'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { del } from '@/lib/client';

export function AccountPrivacy() {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await del('/api/account');
      router.push('/login');
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <section>
        <h2 className="font-medium mb-1">Exporter mes données</h2>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          Archive JSON de votre profil, vos boutiques, vos sessions et vos échanges
          en tant qu&apos;acheteur.
        </p>
        <a
          href="/api/account/export"
          className="inline-block rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
        >
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
        <button
          type="button"
          onClick={remove}
          disabled={busy || confirm !== 'SUPPRIMER'}
          className="rounded-[var(--radius-btn)] bg-[var(--color-danger,#b91c1c)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Supprimer définitivement
        </button>
        {msg ? <p className="mt-2 text-xs text-[var(--color-danger,#b91c1c)]">{msg}</p> : null}
      </section>
    </div>
  );
}
