'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

/** Bandeau permanent quand la session résulte d'une usurpation support. */
export function SupportBanner({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try {
      await post('/api/auth/logout');
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-[var(--color-danger)] px-4 py-1.5 text-xs text-white">
      <span>
        Session support — vous agissez en tant que <strong>{email}</strong>. Toute action est
        journalisée.
      </span>
      <button
        onClick={leave}
        disabled={busy}
        className="shrink-0 rounded border border-white/60 px-2 py-0.5 font-medium disabled:opacity-60"
      >
        Quitter
      </button>
    </div>
  );
}
