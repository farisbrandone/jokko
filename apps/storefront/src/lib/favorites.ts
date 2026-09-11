'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'jokko_favorites';
const MAX = 200;
const listeners = new Set<() => void>();

// Snapshot mis en cache : useSyncExternalStore exige une référence stable tant
// que le contenu ne change pas (sinon boucle de rendu).
let cachedRaw: string | null = null;
let cachedValue: string[] = [];

function rawStore(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): string[] {
  const raw = rawStore();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cachedValue = [];
  }
  return cachedValue;
}

function write(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* stockage indisponible */
  }
  cachedRaw = null;
  listeners.forEach((l) => l());
}

export const favorites = {
  ids: snapshot,
  has(productId: string): boolean {
    return snapshot().includes(productId);
  },
  toggle(productId: string): void {
    const ids = snapshot();
    write(
      ids.includes(productId)
        ? ids.filter((id) => id !== productId)
        : [productId, ...ids].slice(0, MAX),
    );
  },
};

const EMPTY: string[] = [];

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

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function useIsFavorite(productId: string): boolean {
  return useFavorites().includes(productId);
}
