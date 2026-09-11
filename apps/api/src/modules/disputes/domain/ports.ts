import type { DisputeStatus } from '@jokko/contracts';
import type { Dispute } from './dispute.aggregate';

export const DISPUTE_REPOSITORY = Symbol('DISPUTE_REPOSITORY');

export interface DisputeRepository {
  findById(id: string): Promise<Dispute | null>;
  /** Litige actif (non clos) le plus récent pour cette commande, ou `null`. */
  findActiveByOrderId(orderId: string): Promise<Dispute | null>;
  listForShop(shopId: string, status?: DisputeStatus): Promise<Dispute[]>;
  save(dispute: Dispute): Promise<void>;
}
