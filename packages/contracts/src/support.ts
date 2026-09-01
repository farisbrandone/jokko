import { z } from 'zod';
import { IdSchema } from './common';

/** Demande d'usurpation d'identité par un administrateur plateforme (support). */
export const impersonateSchema = z.object({ userId: IdSchema });
export type ImpersonateInput = z.infer<typeof impersonateSchema>;

export const impersonationGrantSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  target: z.object({ id: IdSchema, email: z.string(), name: z.string() }),
});
export type ImpersonationGrant = z.infer<typeof impersonationGrantSchema>;

/** Vue support d'une boutique (console plateforme). */
export const adminShopDetailSchema = z.object({
  id: IdSchema,
  slug: z.string(),
  name: z.string(),
  status: z.enum(['active', 'suspended']),
  createdAt: z.string(),
  owner: z.object({ id: IdSchema, email: z.string(), name: z.string() }).nullable(),
});
export type AdminShopDetail = z.infer<typeof adminShopDetailSchema>;
