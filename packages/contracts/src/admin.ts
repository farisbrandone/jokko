import { z } from 'zod';
import { IdSchema, paginated } from './common';

export const PlatformOverviewSchema = z.object({
  shops: z.object({ total: z.number().int(), active: z.number().int(), suspended: z.number().int() }),
  users: z.number().int(),
  products: z.object({ total: z.number().int(), published: z.number().int() }),
  conversationsOpen: z.number().int(),
  eventsLast7d: z.number().int(),
  newShops7d: z.number().int(),
});
export type PlatformOverview = z.infer<typeof PlatformOverviewSchema>;

export const AdminShopRowSchema = z.object({
  id: IdSchema,
  slug: z.string(),
  name: z.string(),
  status: z.enum(['active', 'suspended']),
  ownerEmail: z.string().nullable(),
  products: z.number().int(),
  conversations: z.number().int(),
  createdAt: z.string(),
});
export type AdminShopRow = z.infer<typeof AdminShopRowSchema>;

export const AdminShopListSchema = paginated(AdminShopRowSchema);
export type AdminShopList = z.infer<typeof AdminShopListSchema>;
