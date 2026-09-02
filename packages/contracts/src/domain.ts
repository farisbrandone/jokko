import { z } from 'zod';

export const customDomainInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(4)
    .max(253)
    .regex(
      /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/,
      'Nom de domaine invalide (ex. boutique.exemple.com)',
    ),
});
export type CustomDomainInput = z.infer<typeof customDomainInputSchema>;

export const customDomainStatusSchema = z.object({
  domain: z.string().nullable(),
  verified: z.boolean(),
  verification: z
    .object({
      recordName: z.string(),
      recordValue: z.string(),
      cnameTarget: z.string(),
    })
    .nullable(),
});
export type CustomDomainStatus = z.infer<typeof customDomainStatusSchema>;
