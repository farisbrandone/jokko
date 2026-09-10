import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type {
  DeliveryMethod,
  OrderLine,
  OrderStatus,
  PaymentMethod,
} from '@jokko/contracts';

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
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  deliveryZoneLabel: string | null;
  deliveryFee: number;
  deliveryAddress: string | null;
  buyerTokenHash: string;
  txRef: string | null;
  providerTxId: string | null;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  deliveredAt: string | null;
}

export const hashOrderToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Commande passée par un acheteur : paiement en ligne (passerelle) ou à la livraison. */
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
    private readonly _paymentMethod: PaymentMethod,
    private readonly _deliveryMethod: DeliveryMethod,
    private readonly _deliveryZoneLabel: string | null,
    private readonly _deliveryFee: number,
    private readonly _deliveryAddress: string | null,
    private readonly _buyerTokenHash: string,
    private _txRef: string | null,
    private _providerTxId: string | null,
    private readonly _createdAt: Date,
    private _paidAt: Date | null,
    private _fulfilledAt: Date | null,
    private _deliveredAt: Date | null,
  ) {}

  static create(props: {
    shopId: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    note?: string;
    lines: OrderLine[];
    currency: string;
    paymentMethod: PaymentMethod;
    deliveryMethod: DeliveryMethod;
    deliveryZoneLabel?: string | null;
    deliveryFee?: number;
    deliveryAddress?: string | null;
  }): { order: Order; token: string } {
    const token = randomBytes(24).toString('base64url');
    const subtotal = props.lines.reduce((sum, l) => sum + l.unitAmount * l.qty, 0);
    const fee = Math.max(0, Math.round(props.deliveryFee ?? 0));
    const status: OrderStatus =
      props.paymentMethod === 'cash_on_delivery' ? 'to_deliver' : 'pending_payment';
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
      status,
      props.paymentMethod,
      props.deliveryMethod,
      props.deliveryZoneLabel?.trim() || null,
      fee,
      props.deliveryAddress?.trim() || null,
      hashOrderToken(token),
      null,
      null,
      now,
      null,
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
      s.paymentMethod,
      s.deliveryMethod,
      s.deliveryZoneLabel,
      s.deliveryFee,
      s.deliveryAddress,
      s.buyerTokenHash,
      s.txRef,
      s.providerTxId,
      new Date(s.createdAt),
      s.paidAt ? new Date(s.paidAt) : null,
      s.fulfilledAt ? new Date(s.fulfilledAt) : null,
      s.deliveredAt ? new Date(s.deliveredAt) : null,
    );
  }

  get status(): OrderStatus {
    return this._status;
  }
  get subtotal(): number {
    return this._subtotal;
  }
  get deliveryFee(): number {
    return this._deliveryFee;
  }
  /** Montant à encaisser : sous-total + frais de livraison. */
  get total(): number {
    return this._subtotal + this._deliveryFee;
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
  get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }
  get deliveryZoneLabel(): string | null {
    return this._deliveryZoneLabel;
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

  /** Expédiée (en ligne) ou livrée + encaissée (paiement à la livraison). */
  fulfill(now = new Date()): void {
    if (this._status === 'paid' || this._status === 'to_deliver') {
      this._status = 'fulfilled';
      this._fulfilledAt = now;
      this._deliveredAt = now;
    }
  }

  cancel(): void {
    if (
      this._status === 'pending_payment' ||
      this._status === 'to_deliver' ||
      this._status === 'paid'
    ) {
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
      paymentMethod: this._paymentMethod,
      deliveryMethod: this._deliveryMethod,
      deliveryZoneLabel: this._deliveryZoneLabel,
      deliveryFee: this._deliveryFee,
      deliveryAddress: this._deliveryAddress,
      buyerTokenHash: this._buyerTokenHash,
      txRef: this._txRef,
      providerTxId: this._providerTxId,
      createdAt: this._createdAt.toISOString(),
      paidAt: this._paidAt ? this._paidAt.toISOString() : null,
      fulfilledAt: this._fulfilledAt ? this._fulfilledAt.toISOString() : null,
      deliveredAt: this._deliveredAt ? this._deliveredAt.toISOString() : null,
    };
  }
}
