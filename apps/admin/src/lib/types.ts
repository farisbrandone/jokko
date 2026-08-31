export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  memberships: { shopId: string; slug: string; role: string }[];
}

export interface PlatformOverview {
  shops: { total: number; active: number; suspended: number };
  users: number;
  products: { total: number; published: number };
  conversationsOpen: number;
  eventsLast7d: number;
  newShops7d: number;
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
