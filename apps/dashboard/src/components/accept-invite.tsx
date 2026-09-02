'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
import { bffSend } from '@/lib/bff';

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await bffSend<{ shopId: string }>(
        '/api/proxy/invitations/accept',
        'POST',
        { token },
      );
      router.push(`/s/${res.shopId}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={accept} disabled={busy}>
        {busy ? '…' : "Accepter l'invitation"}
      </Button>
      {err ? <p className="text-xs text-[var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
