import { z } from 'zod';
import { IdSchema, paginated } from './common';

export const OrderStatusSchema = z.enum([
  'pending_payment',
  'to_deliver',
  'paid',
  'fulfilled',
  'canceled',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentMethodSchema = z.enum(['online', 'cash_on_delivery']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const DeliveryMethodSchema = z.enum(['pickup', 'delivery']);
export type DeliveryMethod = z.infer<typeof DeliveryMethodSchema>;

const PhoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'numéro E.164 attendu');

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: IdSchema,
        variantId: z.string().max(40).optional(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  buyerName: z.string().trim().min(2).max(80),
  buyerPhone: PhoneSchema,
  buyerEmail: z.string().email().max(320).optional(),
  note: z.string().trim().max(500).optional(),
  paymentMethod: PaymentMethodSchema.default('online'),
  deliveryMethod: DeliveryMethodSchema.default('pickup'),
  /** Requis si deliveryMethod === 'delivery' — id d'une zone de la boutique. */
  deliveryZoneId: z.string().max(40).optional(),
  deliveryAddress: z.string().trim().max(600).optional(),
  /** Code de réduction saisi par l'acheteur — revalidé et recalculé côté serveur. */
  discountCode: z.string().trim().min(3).max(24).optional(),
  /** URL de retour après paiement (fournie par la vitrine, sur son propre domaine). */
  returnUrl: z.string().url().max(2048),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const ConfirmOrderSchema = z.object({
  token: z.string().min(10).max(200),
  txRef: z.string().min(6).max(80),
});
export type ConfirmOrderInput = z.infer<typeof ConfirmOrderSchema>;

export const OrderLineSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable().optional(),
  variantLabel: z.string().nullable().optional(),
  name: z.string(),
  unitAmount: z.number().int().nonnegative(),
  qty: z.number().int().min(1),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const OrderSchema = z.object({
  id: IdSchema,
  status: OrderStatusSchema,
  buyerName: z.string(),
  buyerPhone: z.string(),
  buyerEmail: z.string().nullable(),
  note: z.string().nullable(),
  lines: z.array(OrderLineSchema),
  subtotal: z.number().int().nonnegative(),
  currency: z.string(),
  paymentMethod: PaymentMethodSchema,
  deliveryMethod: DeliveryMethodSchema,
  deliveryZoneLabel: z.string().nullable(),
  deliveryFee: z.number().int().nonnegative(),
  deliveryAddress: z.string().nullable(),
  discountCode: z.string().nullable(),
  discountAmount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  createdAt: z.string(),
  paidAt: z.string().nullable(),
  fulfilledAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderCheckoutSchema = z.object({
  orderId: IdSchema,
  buyerToken: z.string(),
  /** Null pour un paiement à la livraison : la vitrine redirige alors vers le suivi. */
  checkoutUrl: z.string().url().nullable(),
});
export type OrderCheckout = z.infer<typeof OrderCheckoutSchema>;

export const OrderListSchema = paginated(OrderSchema);
export type OrderList = z.infer<typeof OrderListSchema>;
