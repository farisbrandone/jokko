import { z } from 'zod';
import { IdSchema } from './common';
import { ShopRoleSchema } from './membership';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(2).max(80),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const SessionUserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string(),
  isPlatformAdmin: z.boolean(),
  /** Id de l'administrateur agissant si la session résulte d'une usurpation support. */
  impersonatedBy: z.string().nullable().optional(),
  memberships: z.array(
    z.object({ shopId: IdSchema, slug: z.string(), role: ShopRoleSchema }),
  ),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;
