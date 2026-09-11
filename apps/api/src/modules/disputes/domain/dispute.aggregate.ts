import { randomUUID } from 'node:crypto';
import type { DisputeReason, DisputeResolution, DisputeStatus } from '@jokko/contracts';

export interface DisputeSnapshot {
  id: string;
  shopId: string;
  orderId: string;
  buyerPhone: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  sellerResponse: string | null;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  escalationNote: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  closedAt: string | null;
}

/** Litige ouvert par un acheteur sur une commande, résolu par le vendeur ou médié par la plateforme. */
export class Dispute {
  private constructor(
    readonly id: string,
    readonly shopId: string,
    readonly orderId: string,
    readonly buyerPhone: string,
    private readonly _reason: DisputeReason,
    private readonly _description: string,
    private _status: DisputeStatus,
    private _sellerResponse: string | null,
    private _resolution: DisputeResolution | null,
    private _resolutionNote: string | null,
    private _escalationNote: string | null,
    private _adminNote: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _escalatedAt: Date | null,
    private _closedAt: Date | null,
  ) {}

  static open(props: {
    shopId: string;
    orderId: string;
    buyerPhone: string;
    reason: DisputeReason;
    description: string;
  }): Dispute {
    const now = new Date();
    return new Dispute(
      randomUUID(),
      props.shopId,
      props.orderId,
      props.buyerPhone,
      props.reason,
      props.description.trim(),
      'open',
      null,
      null,
      null,
      null,
      null,
      now,
      now,
      null,
      null,
    );
  }

  static restore(s: DisputeSnapshot): Dispute {
    return new Dispute(
      s.id,
      s.shopId,
      s.orderId,
      s.buyerPhone,
      s.reason,
      s.description,
      s.status,
      s.sellerResponse,
      s.resolution,
      s.resolutionNote,
      s.escalationNote,
      s.adminNote,
      new Date(s.createdAt),
      new Date(s.updatedAt),
      s.escalatedAt ? new Date(s.escalatedAt) : null,
      s.closedAt ? new Date(s.closedAt) : null,
    );
  }

  get status(): DisputeStatus {
    return this._status;
  }

  /** Le litige accepte encore une action de l'acheteur ou du vendeur. */
  get isActive(): boolean {
    return this._status !== 'resolved' && this._status !== 'closed';
  }

  /** Peut recevoir une réponse vendeur (pas encore transmis à la plateforme ni clos). */
  get canRespond(): boolean {
    return this._status === 'open' || this._status === 'seller_responded';
  }

  /** Peut être transmis à la médiation plateforme. */
  get canEscalate(): boolean {
    return this._status === 'open' || this._status === 'seller_responded';
  }

  /** Réponse du vendeur — avec ou sans résolution proposée. Précondition : `canRespond`. */
  respond(input: {
    response: string;
    resolution?: DisputeResolution;
    resolutionNote?: string | null;
  }): void {
    this._sellerResponse = input.response.trim();
    if (input.resolution) {
      this._resolution = input.resolution;
      this._resolutionNote = input.resolutionNote?.trim() || null;
      this._status = 'resolved';
    } else {
      this._status = 'seller_responded';
    }
    this._updatedAt = new Date();
  }

  /** L'acheteur transmet le litige à la médiation plateforme. Précondition : `canEscalate`. */
  escalate(note?: string | null): void {
    this._status = 'escalated';
    this._escalationNote = note?.trim() || null;
    this._escalatedAt = new Date();
    this._updatedAt = new Date();
  }

  /** Décision finale de la plateforme — clôture le litige. Précondition : statut `escalated`. */
  mediate(resolution: DisputeResolution, note?: string | null): void {
    this._resolution = resolution;
    this._adminNote = note?.trim() || null;
    this._status = 'closed';
    this._closedAt = new Date();
    this._updatedAt = new Date();
  }

  toSnapshot(): DisputeSnapshot {
    return {
      id: this.id,
      shopId: this.shopId,
      orderId: this.orderId,
      buyerPhone: this.buyerPhone,
      reason: this._reason,
      description: this._description,
      status: this._status,
      sellerResponse: this._sellerResponse,
      resolution: this._resolution,
      resolutionNote: this._resolutionNote,
      escalationNote: this._escalationNote,
      adminNote: this._adminNote,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      escalatedAt: this._escalatedAt ? this._escalatedAt.toISOString() : null,
      closedAt: this._closedAt ? this._closedAt.toISOString() : null,
    };
  }
}
