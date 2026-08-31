import { z } from 'zod';
import { IdSchema } from './common';

/** Verticales du lancement (biens de consommation). Immobilier & auto : Phase 3. */
export const VerticalSchema = z.enum([
  'electronique',
  'mode-accessoires',
  'maison-cuisine',
  'beaute-soin',
  'sport',
]);
export type Vertical = z.infer<typeof VerticalSchema>;

export const SlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide (a-z, 0-9, tirets)');

export const ShopSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: z.string().min(2).max(80),
  verticals: z.array(VerticalSchema).min(1),
  whatsapp: z.string().regex(/^\+[1-9]\d{6,14}$/, 'numéro E.164 attendu').optional(),
  themePreset: z.enum(['grid', 'editorial', 'single', 'dense']).default('grid'),
  locale: z.string().default('fr'),
  currency: z.string().length(3).default('XOF'),
  customDomain: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Shop = z.infer<typeof ShopSchema>;

export const CreateShopSchema = ShopSchema.pick({
  name: true,
  verticals: true,
  whatsapp: true,
  themePreset: true,
}).extend({
  slug: SlugSchema.optional(), // dérivé du nom si absent
});
export type CreateShopInput = z.infer<typeof CreateShopSchema>;
