import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { OrderLine, OrderStatus } from '@jokko/contracts';

export interface OrderSnapshot {
  id: string;
  shopId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  note: string | null;
  lines: OrderLine[];
  subtotal: number;
  currency: string;
  status: OrderStatus;
  buyerTokenHash: string;
  txRef: string | null;
  providerTxId: string | null;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
}

export const hashOrderToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Commande passée par un acheteur sur une boutique (paiement via la passerelle). */
export class Order {
  private constructor(
    readonly id: string,
    readonly shopId: string,
    private readonly _buyerName: string,
    private readonly _buyerPhone: string,
    private readonly _buyerEmail: string | null,
    private readonly _note: string | null,
    private readonly _lines: OrderLine[],
    private readonly _subtotal: number,
    private readonly _currency: string,
    private _status: OrderStatus,
    private readonly _buyerTokenHash: string,
    private _txRef: string | null,
    private _providerTxId: string | null,
    private readonly _createdAt: Date,
    private _paidAt: Date | null,
    private _fulfilledAt: Date | null,
  ) {}

  static create(props: {
    shopId: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    note?: string;
    lines: OrderLine[];
    currency: string;
  }): { order: Order; token: string } {
    const token = randomBytes(24).toString('base64url');
    const subtotal = props.lines.reduce((sum, l) => sum + l.unitAmount * l.qty, 0);
    const now = new Date();
    const order = new Order(
      randomUUID(),
      props.shopId,
      props.buyerName.trim(),
      props.buyerPhone.trim(),
      props.buyerEmail?.trim() || null,
      props.note?.trim() || null,
      props.lines,
      subtotal,
      props.currency,
      'pending_payment',
      hashOrderToken(token),
      null,
      null,
      now,
      null,
      null,
    );
    return { order, token };
  }

  static restore(s: OrderSnapshot): Order {
    return new Order(
      s.id,
      s.shopId,
      s.buyerName,
      s.buyerPhone,
      s.buyerEmail,
      s.note,
      s.lines,
      s.subtotal,
      s.currency,
      s.status,
      s.buyerTokenHash,
      s.txRef,
      s.providerTxId,
      new Date(s.createdAt),
      s.paidAt ? new Date(s.paidAt) : null,
      s.fulfilledAt ? new Date(s.fulfilledAt) : null,
    );
  }

  get status(): OrderStatus {
    return this._status;
  }
  get subtotal(): number {
    return this._subtotal;
  }
  get currency(): string {
    return this._currency;
  }
  get lines(): OrderLine[] {
    return this._lines;
  }
  get buyerEmail(): string | null {
    return this._buyerEmail;
  }
  get buyerName(): string {
    return this._buyerName;
  }

  matchesToken(token: string): boolean {
    return hashOrderToken(token) === this._buyerTokenHash;
  }

  attachPaymentRef(txRef: string): void {
    this._txRef = txRef;
  }

  /** Idempotent : ne fait rien si déjà payée. Retourne `true` si transition effectuée. */
  markPaid(providerTxId: string, now = new Date()): boolean {
    if (this._status !== 'pending_payment') return false;
    this._status = 'paid';
    this._providerTxId = providerTxId;
    this._paidAt = now;
    return true;
  }

  fulfill(now = new Date()): void {
    if (this._status === 'paid') {
      this._status = 'fulfilled';
      this._fulfilledAt = now;
    }
  }

  cancel(): void {
    if (this._status === 'pending_payment' || this._status === 'paid') {
      this._status = 'canceled';
    }
  }

  toSnapshot(): OrderSnapshot {
    return {
      id: this.id,
      shopId: this.shopId,
      buyerName: this._buyerName,
      buyerPhone: this._buyerPhone,
      buyerEmail: this._buyerEmail,
      note: this._note,
      lines: this._lines,
      subtotal: this._subtotal,
      currency: this._currency,
      status: this._status,
      buyerTokenHash: this._buyerTokenHash,
      txRef: this._txRef,
      providerTxId: this._providerTxId,
      createdAt: this._createdAt.toISOString(),
      paidAt: this._paidAt ? this._paidAt.toISOString() : null,
      fulfilledAt: this._fulfilledAt ? this._fulfilledAt.toISOString() : null,
    };
  }
}
