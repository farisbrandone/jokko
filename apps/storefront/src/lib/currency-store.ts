'use client';

import { useSyncExternalStore } from 'react';
import type { DisplayCurrency } from './fx';

export type DisplayPref = DisplayCurrency | 'none';

const KEY = 'jokko_display_currency';
const listeners = new Set<() => void>();

function snapshot(): DisplayPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'EUR' || v === 'USD' ? v : 'none';
  } catch {
    return 'none';
  }
}

export function setDisplayCurrency(pref: DisplayPref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* stockage indisponible */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDisplayCurrency(): DisplayPref {
  return useSyncExternalStore(subscribe, snapshot, () => 'none');
}
