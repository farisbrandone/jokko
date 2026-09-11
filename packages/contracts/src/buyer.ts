import { z } from 'zod';
import { IdSchema } from './common';
import { OrderSchema } from './orders';

export const BuyerAddressSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  label: z.string().trim().min(1).max(40),
  address: z.string().trim().min(1).max(300),
});
export type BuyerAddressInput = z.infer<typeof BuyerAddressSchema>;

export const BuyerAddressesSchema = z.array(BuyerAddressSchema).max(5);

export const BuyerSchema = z.object({
  id: IdSchema,
  phone: z.string(),
  name: z.string().nullable(),
  addresses: z.array(BuyerAddressSchema.extend({ id: z.string() })),
  createdAt: z.string(),
});
export type Buyer = z.infer<typeof BuyerSchema>;

export const UpdateBuyerSchema = z.object({
  name: z.string().trim().max(80).nullable().optional(),
  addresses: BuyerAddressesSchema.optional(),
});
export type UpdateBuyerInput = z.infer<typeof UpdateBuyerSchema>;

export const BuyerAuthResultSchema = z.object({
  token: z.string(),
  buyer: BuyerSchema,
});
export type BuyerAuthResult = z.infer<typeof BuyerAuthResultSchema>;

/** Commande d'un acheteur authentifié, enrichie de la boutique (historique multi-boutique). */
export const BuyerOrderSchema = OrderSchema.extend({
  shopName: z.string(),
  shopSlug: z.string(),
});
export type BuyerOrder = z.infer<typeof BuyerOrderSchema>;

export const BuyerOrderListSchema = z.array(BuyerOrderSchema);
export type BuyerOrderList = z.infer<typeof BuyerOrderListSchema>;
