export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  impersonatedBy?: string | null;
  memberships: { shopId: string; slug: string; role: string }[];
}

export interface PlatformOverview {
  shops: { total: number; active: number; suspended: number };
  users: number;
  products: { total: number; published: number };
  conversationsOpen: number;
  eventsLast7d: number;
  newShops7d: number;
  pendingReports: number;
  activeSubscriptions: number;
}

export type ReportStatus = 'pending' | 'actioned' | 'dismissed';

export interface AdminReportRow {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  targetType: 'product' | 'shop';
  targetId: string;
  targetLabel: string | null;
  reason: string;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportList {
  items: AdminReportRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminShopDetail {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  createdAt: string;
  owner: { id: string; email: string; name: string } | null;
}

export interface ImpersonationGrant {
  token: string;
  expiresAt: string;
  target: { id: string; email: string; name: string };
}

export interface AdminShopRow {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  ownerEmail: string | null;
  products: number;
  conversations: number;
  createdAt: string;
}

export interface AdminShopList {
  items: AdminShopRow[];
  total: number;
  page: number;
  pageSize: number;
}

export type ShopVerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface AdminShopVerificationRow {
  shopId: string;
  shopName: string;
  shopSlug: string;
  status: ShopVerificationStatus;
  legalName: string | null;
  registryNumber: string | null;
  note: string | null;
  proofImageUrl: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface AdminShopVerificationList {
  items: AdminShopVerificationRow[];
  total: number;
  page: number;
  pageSize: number;
}

export type DisputeReason = 'not_received' | 'not_as_described' | 'damaged' | 'wrong_item' | 'other';
export type DisputeStatus = 'open' | 'seller_responded' | 'resolved' | 'escalated' | 'closed';
export type DisputeResolution = 'refund' | 'replacement' | 'rejected';

export interface AdminDisputeRow {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
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

export interface AdminDisputeList {
  items: AdminDisputeRow[];
  total: number;
  page: number;
  pageSize: number;
}
