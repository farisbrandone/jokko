import { z } from 'zod';

/** Rôles d'un utilisateur au sein d'une boutique (du plus au moins large). */
export const ShopRoleSchema = z.enum(['owner', 'admin', 'staff', 'viewer']);
export type ShopRole = z.infer<typeof ShopRoleSchema>;

export const ROLE_RANK: Record<ShopRole, number> = {
  owner: 3,
  admin: 2,
  staff: 1,
  viewer: 0,
};

export const roleAtLeast = (have: ShopRole, needed: ShopRole): boolean =>
  ROLE_RANK[have] >= ROLE_RANK[needed];
