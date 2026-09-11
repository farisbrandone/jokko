import { z } from 'zod';
import { IdSchema, paginated } from './common';

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

/** Zone de livraison : un libellé (ville / quartier) et des frais dans la devise de la boutique. */
export const DeliveryZoneSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  label: z.string().trim().min(1).max(60),
  fee: z.number().int().nonnegative().max(100_000_000),
});
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;
export const DeliveryZonesSchema = z.array(DeliveryZoneSchema).max(40);

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
  // Apparence de la vitrine (page d'accueil de la boutique).
  heroTitle: z.string().trim().max(80).nullable().optional(),
  heroSubtitle: z.string().trim().max(160).nullable().optional(),
  heroImageUrl: z.string().url().max(600).nullable().optional(),
  accentColor: BrandColorSchema.nullable().optional(),
  announcement: z.string().trim().max(160).nullable().optional(),
  deliveryZones: DeliveryZonesSchema.default([]),
  /** Seuil d'alerte « stock bas » dans le tableau de bord. */
  lowStockThreshold: z.number().int().min(0).max(999).default(3),
  /** Badge public « boutique vérifiée » — détails de la demande sur un point d'accès séparé (privé). */
  verified: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type Shop = z.infer<typeof ShopSchema>;

export const ShopVerificationStatusSchema = z.enum(['none', 'pending', 'verified', 'rejected']);
export type ShopVerificationStatus = z.infer<typeof ShopVerificationStatusSchema>;

/** Demande de vérification — vue vendeur (privée, jamais exposée publiquement). */
export const ShopVerificationSchema = z.object({
  status: ShopVerificationStatusSchema,
  legalName: z.string().nullable(),
  registryNumber: z.string().nullable(),
  note: z.string().nullable(),
  proofImageUrl: z.string().nullable(),
  submittedAt: z.string().nullable(),
  decidedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
});
export type ShopVerification = z.infer<typeof ShopVerificationSchema>;

export const SubmitShopVerificationSchema = z.object({
  legalName: z.string().trim().min(2).max(140),
  registryNumber: z.string().trim().min(2).max(60),
  note: z.string().trim().max(500).nullable().optional(),
  proofImageUrl: z.string().url().max(600).nullable().optional(),
});
export type SubmitShopVerificationInput = z.infer<typeof SubmitShopVerificationSchema>;

/** Vue console plateforme : la demande + l'identité de la boutique concernée. */
export const AdminShopVerificationSchema = ShopVerificationSchema.extend({
  shopId: IdSchema,
  shopName: z.string(),
  shopSlug: z.string(),
});
export type AdminShopVerification = z.infer<typeof AdminShopVerificationSchema>;

export const AdminShopVerificationListSchema = paginated(AdminShopVerificationSchema);
export type AdminShopVerificationList = z.infer<typeof AdminShopVerificationListSchema>;

export const DecideShopVerificationSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(300).nullable().optional(),
});
export type DecideShopVerificationInput = z.infer<typeof DecideShopVerificationSchema>;

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
    heroTitle: z.string().trim().max(80).nullable(),
    heroSubtitle: z.string().trim().max(160).nullable(),
    heroImageUrl: z.string().url().max(600).nullable(),
    accentColor: BrandColorSchema.nullable(),
    announcement: z.string().trim().max(160).nullable(),
    deliveryZones: DeliveryZonesSchema,
    lowStockThreshold: z.number().int().min(0).max(999),
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
  verified: z.boolean(),
});
export type DirectoryShop = z.infer<typeof DirectoryShopSchema>;

export const DirectoryResultSchema = z.object({
  items: z.array(DirectoryShopSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type DirectoryResult = z.infer<typeof DirectoryResultSchema>;
