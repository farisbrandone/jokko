import { z } from 'zod';
import { ShopRoleSchema } from './membership';

/** Rôles proposables via l'UI d'invitation (jamais « owner »). */
export const invitableRoleSchema = z.enum(['admin', 'staff', 'viewer']);
export type InvitableRole = z.infer<typeof invitableRoleSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email().max(320),
  role: invitableRoleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({ role: ShopRoleSchema });
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const acceptInviteSchema = z.object({ token: z.string().min(10).max(200) });
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const memberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  role: ShopRoleSchema,
  isSelf: z.boolean(),
});
export type Member = z.infer<typeof memberSchema>;

export const invitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: ShopRoleSchema,
  invitedByName: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const invitePreviewSchema = z.object({
  shopName: z.string(),
  role: ShopRoleSchema,
  invitedByName: z.string().nullable(),
  email: z.string(),
  expired: z.boolean(),
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;
