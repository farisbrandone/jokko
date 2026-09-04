'use client';

import { useSyncExternalStore } from 'react';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  unitAmount: number;
  currency: string;
  image: string | null;
  qty: number;
}

const KEY = 'jokko_cart';
const listeners = new Set<() => void>();

// Snapshot mis en cache : useSyncExternalStore exige une référence stable tant
// que le contenu ne change pas (sinon boucle de rendu → « client-side exception »).
let cachedRaw: string | null = null;
let cachedValue: CartItem[] = [];

function rawStore(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): CartItem[] {
  const raw = rawStore();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    cachedValue = [];
  }
  return cachedValue;
}

function read(): CartItem[] {
  return snapshot();
}

function write(items: CartItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* stockage indisponible */
  }
  cachedRaw = null; // force le recalcul au prochain snapshot
  listeners.forEach((l) => l());
}

export const cart = {
  items: read,
  add(item: Omit<CartItem, 'qty'>, qty = 1): void {
    const items = read().map((i) => ({ ...i }));
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else items.push({ ...item, qty });
    write(items);
  },
  setQty(productId: string, qty: number): void {
    const items = read()
      .map((i) => (i.productId === productId ? { ...i, qty } : { ...i }))
      .filter((i) => i.qty > 0);
    write(items);
  },
  remove(productId: string): void {
    write(read().filter((i) => i.productId !== productId));
  },
  clear(): void {
    write([]);
  },
};

const EMPTY: CartItem[] = [];

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cachedRaw = null;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    subscribe,
    snapshot,
    () => EMPTY,
  );
}

// ── Référence de commande en cours (pour la page de retour) ──
const ORDER_KEY = 'jokko_pending_order';
export function rememberOrder(orderId: string, buyerToken: string): void {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify({ orderId, buyerToken }));
  } catch {
    /* ignore */
  }
}
export function recallOrder(): { orderId: string; buyerToken: string } | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? (JSON.parse(raw) as { orderId: string; buyerToken: string }) : null;
  } catch {
    return null;
  }
}
