'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

export function ShopStatusToggle({
  shopId,
  status,
}: {
  shopId: string;
  status: 'active' | 'suspended';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === 'active' ? 'suspended' : 'active';

  const toggle = async () => {
    if (next === 'suspended' && !confirm('Suspendre cette boutique ? Elle ne sera plus servie.'))
      return;
    setBusy(true);
    try {
      await post(`/api/proxy/admin/shops/${shopId}/status`, { status: next });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-[var(--radius-btn)] border px-2.5 py-1 text-xs disabled:opacity-60 ${
        status === 'active'
          ? 'border-[var(--color-border)]'
          : 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
      }`}
    >
      {status === 'active' ? 'Suspendre' : 'Réactiver'}
    </button>
  );
}
