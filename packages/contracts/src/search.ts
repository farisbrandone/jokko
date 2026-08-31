import { z } from 'zod';
import { IdSchema } from './common';

export const ProductSearchSortSchema = z.enum([
  'relevance',
  'price_asc',
  'price_desc',
  'newest',
]);
export type ProductSearchSort = z.infer<typeof ProductSearchSortSchema>;

export const ProductSearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  inStock: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .optional(),
  sort: ProductSearchSortSchema.default('relevance'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(60).default(24),
});
export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>;

export const SearchHitSchema = z.object({
  id: IdSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  priceAmount: z.number().int(),
  currency: z.string(),
  compareAtPriceAmount: z.number().int().nullable(),
  stock: z.number().int(),
  inStock: z.boolean(),
  images: z.array(z.string()),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const ProductSearchResultSchema = z.object({
  items: z.array(SearchHitSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  facets: z.record(z.string(), z.record(z.string(), z.number())),
});
export type ProductSearchResult = z.infer<typeof ProductSearchResultSchema>;
