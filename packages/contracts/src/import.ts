import { z } from 'zod';

export const importUrlSchema = z.object({
  url: z.string().url().max(2048),
});
export type ImportUrlInput = z.infer<typeof importUrlSchema>;

export const importCsvSchema = z.object({
  csv: z.string().min(1).max(200_000),
});
export type ImportCsvInput = z.infer<typeof importCsvSchema>;

/** Ébauche de produit extraite d'une source externe (non enregistrée). */
export const draftProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  priceAmount: z.number().int().nonnegative(),
  currency: z.string(),
  stock: z.number().int().nonnegative(),
  images: z.array(z.string().url()),
});
export type DraftProduct = z.infer<typeof draftProductSchema>;

export const csvImportResultSchema = z.object({
  created: z.number(),
  skipped: z.array(z.object({ line: z.number(), error: z.string() })),
});
export type CsvImportResult = z.infer<typeof csvImportResultSchema>;
