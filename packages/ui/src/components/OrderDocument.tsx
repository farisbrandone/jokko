import type { CSSProperties } from 'react';

const ZERO_DECIMAL = new Set(['XOF', 'XAF', 'JPY', 'KRW', 'CLP', 'VND']);
function formatMoney(amount: number, currency = 'XOF', locale = 'fr'): string {
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: factor === 1 ? 0 : 2,
    }).format(amount / factor);
  } catch {
    return `${(amount / factor).toLocaleString(locale)} ${currency}`;
  }
}

export interface OrderDocumentData {
  id: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  lines: { name: string; qty: number; unitAmount: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryZoneLabel: string | null;
  deliveryAddress: string | null;
  paymentMethod: 'online' | 'cash_on_delivery';
  status: string;
  note: string | null;
}

export interface OrderDocumentShop {
  name: string;
  tagline?: string | null;
  whatsapp?: string | null;
  brandColor?: string | null;
}

const PAID = new Set(['paid', 'fulfilled']);

/** Facture / bon de livraison imprimable — utilisable côté vitrine et tableau de bord. */
export function OrderDocument({
  type,
  order,
  shop,
}: {
  type: 'invoice' | 'delivery';
  order: OrderDocumentData;
  shop: OrderDocumentShop;
}) {
  const accent = shop.brandColor && /^#[0-9a-f]{6}$/i.test(shop.brandColor) ? shop.brandColor : '#c2410c';
  const title = type === 'invoice' ? 'FACTURE' : 'BON DE LIVRAISON';
  const ref = order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.createdAt).toLocaleDateString('fr', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const money = (n: number) => formatMoney(n, order.currency);
  const showPrices = type === 'invoice';
  const paid = PAID.has(order.status);
  const paymentText =
    order.paymentMethod === 'cash_on_delivery'
      ? paid
        ? 'Réglé à la livraison'
        : `À régler à la livraison : ${money(order.total)}`
      : paid
        ? 'Payé en ligne'
        : 'Paiement en ligne en attente';

  const cell: CSSProperties = { padding: '8px 6px', borderBottom: '1px solid #e7e2da' };
  const th: CSSProperties = {
    ...cell,
    textAlign: 'left',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#78716c',
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 32,
        background: '#fff',
        color: '#1c1917',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <style>{`@page{size:A4;margin:14mm}@media print{.no-print{display:none!important}body{background:#fff}}`}</style>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{shop.name}</div>
          {shop.tagline ? <div style={{ color: '#78716c', fontSize: 13 }}>{shop.tagline}</div> : null}
          {shop.whatsapp ? <div style={{ color: '#78716c', fontSize: 13 }}>{shop.whatsapp}</div> : null}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{title}</div>
          <div style={{ color: '#78716c', fontSize: 13 }}>N° {ref}</div>
          <div style={{ color: '#78716c', fontSize: 13 }}>{date}</div>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: `2px solid ${accent}`, margin: '18px 0' }} />

      {/* Parties */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#78716c', letterSpacing: 0.4 }}>
            Client
          </div>
          <div style={{ fontWeight: 600 }}>{order.buyerName}</div>
          <div style={{ color: '#57534e' }}>{order.buyerPhone}</div>
          {order.buyerEmail ? <div style={{ color: '#57534e' }}>{order.buyerEmail}</div> : null}
        </div>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#78716c', letterSpacing: 0.4 }}>
            Livraison
          </div>
          <div>
            {order.deliveryZoneLabel
              ? `Livraison — ${order.deliveryZoneLabel}`
              : 'Retrait en boutique'}
          </div>
          {order.deliveryAddress ? <div style={{ color: '#57534e' }}>{order.deliveryAddress}</div> : null}
        </div>
      </div>

      {/* Lignes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
        <thead>
          <tr>
            <th style={th}>Désignation</th>
            <th style={{ ...th, textAlign: 'right', width: 60 }}>Qté</th>
            {showPrices ? <th style={{ ...th, textAlign: 'right', width: 110 }}>P.U.</th> : null}
            {showPrices ? <th style={{ ...th, textAlign: 'right', width: 120 }}>Montant</th> : null}
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => (
            <tr key={i}>
              <td style={cell}>{l.name}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{l.qty}</td>
              {showPrices ? (
                <td style={{ ...cell, textAlign: 'right' }}>{money(l.unitAmount)}</td>
              ) : null}
              {showPrices ? (
                <td style={{ ...cell, textAlign: 'right' }}>{money(l.unitAmount * l.qty)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      {showPrices ? (
        <div style={{ marginTop: 14, marginLeft: 'auto', width: 260 }}>
          <Row label="Sous-total" value={money(order.subtotal)} />
          <Row
            label={order.deliveryZoneLabel ? `Livraison (${order.deliveryZoneLabel})` : 'Livraison'}
            value={order.deliveryFee > 0 ? money(order.deliveryFee) : 'Gratuit'}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '2px solid #1c1917',
              marginTop: 6,
              paddingTop: 6,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>TOTAL</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18, fontSize: 13 }}>
        <strong>Paiement :</strong> {paymentText}
      </div>
      {order.note ? (
        <div style={{ marginTop: 6, fontSize: 13, color: '#57534e', fontStyle: 'italic' }}>
          Note : {order.note}
        </div>
      ) : null}

      <hr style={{ border: 0, borderTop: '1px solid #e7e2da', margin: '22px 0 10px' }} />
      <div style={{ textAlign: 'center', fontSize: 12, color: '#a8a29e' }}>
        Merci pour votre commande — {shop.name} · Document généré via Jokko
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13 }}>
      <span style={{ color: '#57534e' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
