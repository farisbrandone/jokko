import { z } from 'zod';
import { IdSchema, MoneySchema, paginated } from './common';
import { SlugSchema } from './shop';

export const ProductStatusSchema = z.enum(['draft', 'published', 'archived']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/** Attributs dynamiques : jeu de clés/valeurs piloté par la catégorie. */
export const DynamicAttributesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
);
export type DynamicAttributes = z.infer<typeof DynamicAttributesSchema>;

export const ProductSchema = z.object({
  id: IdSchema,
  shopId: IdSchema,
  slug: SlugSchema,
  name: z.string().min(2).max(140),
  description: z.string().max(5000).default(''),
  category: z.string().min(1),
  price: MoneySchema,
  compareAtPrice: MoneySchema.nullable().default(null),
  stock: z.number().int().nonnegative().default(0),
  images: z.array(z.string().url()).default([]),
  attributes: DynamicAttributesSchema.default({}),
  status: ProductStatusSchema.default('draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = ProductSchema.pick({
  name: true,
  description: true,
  category: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  images: true,
  attributes: true,
}).partial({
  description: true,
  compareAtPrice: true,
  stock: true,
  images: true,
  attributes: true,
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'au moins un champ à modifier' },
);
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const ProductListSchema = paginated(ProductSchema);
export type ProductList = z.infer<typeof ProductListSchema>;
