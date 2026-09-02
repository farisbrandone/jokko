'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
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
    <Button
      onClick={toggle}
      disabled={busy}
      size="sm"
      variant={status === 'active' ? 'secondary' : 'primary'}
    >
      {status === 'active' ? 'Suspendre' : 'Réactiver'}
    </Button>
  );
}
