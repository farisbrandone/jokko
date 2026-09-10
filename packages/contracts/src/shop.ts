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

export const ThemePresetSchema = z.enum(['grid', 'editorial', 'single', 'dense']);
export type ThemePreset = z.infer<typeof ThemePresetSchema>;

/** Catégories libres définies par le vendeur pour sa boutique (dédoublonnées côté domaine). */
export const ShopCategoriesSchema = z.array(z.string().trim().min(1).max(40)).max(50);
export type ShopCategories = z.infer<typeof ShopCategoriesSchema>;

/** Couleur de marque en hexadécimal `#rrggbb` (surcharge le token `--color-brand`). */
export const BrandColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'couleur hexadécimale #rrggbb attendue');

export const ShopSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: z.string().min(2).max(80),
  verticals: z.array(VerticalSchema).min(1),
  whatsapp: z.string().regex(/^\+[1-9]\d{6,14}$/, 'numéro E.164 attendu').optional(),
  themePreset: ThemePresetSchema.default('grid'),
  brandColor: BrandColorSchema.nullable().optional(),
  locale: z.string().default('fr'),
  currency: z.string().length(3).default('XOF'),
  customDomain: z.string().optional(),
  listed: z.boolean().default(false),
  tagline: z.string().max(140).nullable().optional(),
  categories: ShopCategoriesSchema.default([]),
  createdAt: z.string().datetime(),
});
export type Shop = z.infer<typeof ShopSchema>;

export const CreateShopSchema = ShopSchema.pick({
  name: true,
  verticals: true,
  whatsapp: true,
  themePreset: true,
  brandColor: true,
}).extend({
  slug: SlugSchema.optional(), // dérivé du nom si absent
});
export type CreateShopInput = z.infer<typeof CreateShopSchema>;

/** Édition du profil de la boutique par un membre autorisé (au moins un champ). */
export const UpdateShopSchema = z
  .object({
    name: z.string().min(2).max(80),
    whatsapp: z.string().regex(/^\+[1-9]\d{6,14}$/, 'numéro E.164 attendu').nullable(),
    themePreset: ThemePresetSchema,
    brandColor: BrandColorSchema.nullable(),
    listed: z.boolean(),
    tagline: z.string().trim().max(140).nullable(),
    categories: ShopCategoriesSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Au moins un champ est requis' });
export type UpdateShopInput = z.infer<typeof UpdateShopSchema>;

/** Annuaire public des boutiques (page apex). */
export const DirectoryQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  vertical: VerticalSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type DirectoryQuery = z.infer<typeof DirectoryQuerySchema>;

export const DirectoryShopSchema = z.object({
  slug: SlugSchema,
  name: z.string(),
  tagline: z.string().nullable(),
  verticals: z.array(VerticalSchema),
  brandColor: z.string().nullable(),
  products: z.number(),
});
export type DirectoryShop = z.infer<typeof DirectoryShopSchema>;

export const DirectoryResultSchema = z.object({
  items: z.array(DirectoryShopSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type DirectoryResult = z.infer<typeof DirectoryResultSchema>;
