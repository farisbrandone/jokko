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

const PhoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'numéro international attendu (E.164)');

/** Connexion par SMS : demande d'un code puis vérification. */
export const OtpRequestSchema = z.object({ phone: PhoneSchema });
export type OtpRequestInput = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  phone: PhoneSchema,
  code: z.string().regex(/^\d{4,8}$/),
  name: z.string().trim().min(1).max(80).optional(),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;

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
