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

export interface ProductVariant {
  id?: string;
  label: string;
  sku?: string | null;
  priceAmount?: number | null;
  stock: number;
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
  variants: ProductVariant[];
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

export interface DiscountCode {
  id: string;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSubtotal: number | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
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
  lowStockThreshold: number;
  categories: string[];
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  announcement: string | null;
  deliveryZones: { id?: string; label: string; fee: number }[];
  verified: boolean;
}

export type ShopVerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface ShopVerification {
  status: ShopVerificationStatus;
  legalName: string | null;
  registryNumber: string | null;
  note: string | null;
  proofImageUrl: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export type DisputeReason = 'not_received' | 'not_as_described' | 'damaged' | 'wrong_item' | 'other';
export type DisputeStatus = 'open' | 'seller_responded' | 'resolved' | 'escalated' | 'closed';
export type DisputeResolution = 'refund' | 'replacement' | 'rejected';

export interface Dispute {
  id: string;
  shopId: string;
  orderId: string;
  buyerPhone: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  sellerResponse: string | null;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  escalationNote: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  closedAt: string | null;
}

export const VERTICALS = [
  'electronique',
  'mode-accessoires',
  'maison-cuisine',
  'beaute-soin',
  'sport',
] as const;
