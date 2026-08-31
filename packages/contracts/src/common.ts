import { z } from 'zod';

export const IdSchema = z.string().uuid();

export const MoneySchema = z.object({
  /** Montant en plus petite unité (ex. centimes / francs CFA entiers) */
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3).default('XOF'),
});
export type Money = z.infer<typeof MoneySchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
