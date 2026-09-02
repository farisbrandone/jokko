import type { ShopRole } from '@jokko/contracts';

export interface InvitationRecord {
  id: string;
  shopId: string;
  email: string;
  role: ShopRole;
  invitedBy: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');

export interface InvitationRepository {
  create(input: {
    shopId: string;
    email: string;
    role: ShopRole;
    tokenHash: string;
    invitedBy: string | null;
    expiresAt: Date;
  }): Promise<InvitationRecord>;
  /** Remplace une invitation en attente pour le même (boutique, e-mail). */
  upsertPending(input: {
    shopId: string;
    email: string;
    role: ShopRole;
    tokenHash: string;
    invitedBy: string | null;
    expiresAt: Date;
  }): Promise<InvitationRecord>;
  findByTokenHash(tokenHash: string): Promise<InvitationRecord | null>;
  listPending(shopId: string): Promise<InvitationRecord[]>;
  markAccepted(id: string): Promise<void>;
  deletePending(id: string, shopId: string): Promise<boolean>;
}
