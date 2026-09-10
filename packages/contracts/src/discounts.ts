import { z } from 'zod';
import { IdSchema } from './common';

export const DiscountKindSchema = z.enum(['percent', 'fixed']);
export type DiscountKind = z.infer<typeof DiscountKindSchema>;

/** Code saisi par l'acheteur : lettres/chiffres/tiret, normalisé en MAJUSCULES. */
export const DiscountCodeStringSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9-]+$/, 'Lettres, chiffres et tirets uniquement');

export const DiscountCodeSchema = z.object({
  id: IdSchema,
  code: z.string(),
  kind: DiscountKindSchema,
  /** `percent` : 1–90 ; `fixed` : montant en plus petite unité. */
  value: z.number().int().positive(),
  minSubtotal: z.number().int().nonnegative().nullable(),
  maxRedemptions: z.number().int().positive().nullable(),
  redeemedCount: z.number().int().nonnegative(),
  expiresAt: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type DiscountCode = z.infer<typeof DiscountCodeSchema>;

export const CreateDiscountCodeSchema = z
  .object({
    code: DiscountCodeStringSchema,
    kind: DiscountKindSchema,
    value: z.number().int().positive(),
    minSubtotal: z.number().int().nonnegative().nullable().optional(),
    maxRedemptions: z.number().int().positive().max(1_000_000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'percent' && (v.value < 1 || v.value > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Un pourcentage doit être compris entre 1 et 90',
      });
    }
  });
export type CreateDiscountCodeInput = z.infer<typeof CreateDiscountCodeSchema>;

export const UpdateDiscountCodeSchema = z.object({ active: z.boolean() });
export type UpdateDiscountCodeInput = z.infer<typeof UpdateDiscountCodeSchema>;

/** Vérification d'un code au panier (vitrine). */
export const PreviewDiscountSchema = z.object({
  code: DiscountCodeStringSchema,
  subtotal: z.number().int().nonnegative(),
});
export type PreviewDiscountInput = z.infer<typeof PreviewDiscountSchema>;

export const DiscountPreviewSchema = z.object({
  code: z.string(),
  kind: DiscountKindSchema,
  value: z.number().int().positive(),
  discountAmount: z.number().int().nonnegative(),
  label: z.string(),
});
export type DiscountPreview = z.infer<typeof DiscountPreviewSchema>;
