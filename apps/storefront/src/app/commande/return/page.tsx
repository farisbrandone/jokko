'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cart, recallOrder } from '@/lib/cart';

function Return() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState('Vérification du paiement…');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const status = params.get('status');
    const txRef = params.get('tx_ref');
    const pending = recallOrder();

    if (!pending || !txRef) {
      setMsg('Référence de commande introuvable.');
      return;
    }
    if (status && status !== 'successful' && status !== 'completed') {
      setMsg('Le paiement a été annulé.');
      return;
    }

    fetch('/api/orders/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: pending.orderId, token: pending.buyerToken, txRef }),
    })
      .then((r) => r.json())
      .then(() => {
        cart.clear();
        router.replace(`/commande/${pending.orderId}`);
      })
      .catch(() => setMsg('Confirmation en attente — elle se fera automatiquement.'));
  }, [params, router]);

  return <p className="py-16 text-center text-[var(--color-muted)]">{msg}</p>;
}

export default function ReturnPage() {
  return (
    <Suspense fallback={null}>
      <Return />
    </Suspense>
  );
}
