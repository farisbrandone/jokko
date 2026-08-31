import type { ShopRole } from '@jokko/contracts';
import type { User } from './user.aggregate';

export interface MembershipRecord {
  id: string;
  userId: string;
  shopId: string;
  slug: string;
  role: ShopRole;
}

export interface SessionRecord {
  id: string;
  userId: string;
}

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export interface ShopMemberContact {
  userId: string;
  email: string;
  name: string;
  role: ShopRole;
}

export interface MembershipRepository {
  grant(userId: string, shopId: string, role: ShopRole): Promise<void>;
  listByUser(userId: string): Promise<MembershipRecord[]>;
  listMembers(shopId: string): Promise<ShopMemberContact[]>;
  find(userId: string, shopId: string): Promise<MembershipRecord | null>;
}

export interface SessionRepository {
  create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
  }): Promise<SessionRecord>;
  findValidByHash(hash: string): Promise<SessionRecord | null>;
  revokeByHash(hash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
