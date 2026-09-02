export interface SessionUser {
  id: string;
  email: string;
  name: string;
  impersonatedBy?: string | null;
  memberships: { shopId: string; slug: string; role: string }[];
}

export interface Money {
  amount: number;
  currency: string;
}

export interface Product {
  id: string;
  shopId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: Money;
  compareAtPrice: Money | null;
  stock: number;
  images: string[];
  attributes: Record<string, string | number | boolean | string[]>;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  cooldownSeconds: number;
}

export interface BillingSummary {
  plan: 'trial' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string;
  entitled: boolean;
  priceXof: number;
  currency: 'XOF';
}

export type ThemePreset = 'grid' | 'editorial' | 'single' | 'dense';

export interface ShopProfile {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  themePreset: ThemePreset;
  brandColor: string | null;
  listed: boolean;
  tagline: string | null;
}

export const VERTICALS = [
  'electronique',
  'mode-accessoires',
  'maison-cuisine',
  'beaute-soin',
  'sport',
] as const;
