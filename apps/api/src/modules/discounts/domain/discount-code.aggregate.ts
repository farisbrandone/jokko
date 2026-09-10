import { randomUUID } from 'node:crypto';
import type { DiscountKind } from '@jokko/contracts';

export interface DiscountCodeSnapshot {
  id: string;
  shopId: string;
  code: string;
  kind: DiscountKind;
  value: number;
  minSubtotal: number | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

/** Code de réduction d'une boutique. Réduction appliquée au sous-total uniquement. */
export class DiscountCode {
  private constructor(
    readonly id: string,
    readonly shopId: string,
    private readonly _code: string,
    private readonly _kind: DiscountKind,
    private readonly _value: number,
    private readonly _minSubtotal: number | null,
    private readonly _maxRedemptions: number | null,
    private _redeemedCount: number,
    private readonly _expiresAt: Date | null,
    private _active: boolean,
    private readonly _createdAt: Date,
  ) {}

  static create(props: {
    shopId: string;
    code: string;
    kind: DiscountKind;
    value: number;
    minSubtotal?: number | null;
    maxRedemptions?: number | null;
    expiresAt?: string | null;
  }): DiscountCode {
    const value =
      props.kind === 'percent'
        ? Math.max(1, Math.min(90, Math.round(props.value)))
        : Math.max(1, Math.round(props.value));
    return new DiscountCode(
      randomUUID(),
      props.shopId,
      props.code.trim().toUpperCase(),
      props.kind,
      value,
      props.minSubtotal != null ? Math.max(0, Math.round(props.minSubtotal)) : null,
      props.maxRedemptions != null ? Math.max(1, Math.round(props.maxRedemptions)) : null,
      0,
      props.expiresAt ? new Date(props.expiresAt) : null,
      true,
      new Date(),
    );
  }

  static restore(s: DiscountCodeSnapshot): DiscountCode {
    return new DiscountCode(
      s.id,
      s.shopId,
      s.code,
      s.kind,
      s.value,
      s.minSubtotal,
      s.maxRedemptions,
      s.redeemedCount,
      s.expiresAt ? new Date(s.expiresAt) : null,
      s.active,
      new Date(s.createdAt),
    );
  }

  get code(): string {
    return this._code;
  }
  get active(): boolean {
    return this._active;
  }

  setActive(active: boolean): void {
    this._active = active;
  }

  /** Raison de refus, ou `null` si le code est utilisable pour ce sous-total. */
  rejectionReason(subtotal: number, now = new Date()): string | null {
    if (!this._active) return 'Ce code n’est plus actif';
    if (this._expiresAt && this._expiresAt.getTime() <= now.getTime()) {
      return 'Ce code a expiré';
    }
    if (this._maxRedemptions != null && this._redeemedCount >= this._maxRedemptions) {
      return 'Ce code a atteint sa limite d’utilisation';
    }
    if (this._minSubtotal != null && subtotal < this._minSubtotal) {
      return `Ce code s’applique à partir de ${this._minSubtotal} (sous-total)`;
    }
    return null;
  }

  /** Montant de la remise pour ce sous-total, borné à [0, subtotal]. */
  computeDiscount(subtotal: number): number {
    const raw =
      this._kind === 'percent'
        ? Math.round((subtotal * this._value) / 100)
        : this._value;
    return Math.max(0, Math.min(raw, subtotal));
  }

  redeem(): void {
    this._redeemedCount += 1;
  }

  toSnapshot(): DiscountCodeSnapshot {
    return {
      id: this.id,
      shopId: this.shopId,
      code: this._code,
      kind: this._kind,
      value: this._value,
      minSubtotal: this._minSubtotal,
      maxRedemptions: this._maxRedemptions,
      redeemedCount: this._redeemedCount,
      expiresAt: this._expiresAt ? this._expiresAt.toISOString() : null,
      active: this._active,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
