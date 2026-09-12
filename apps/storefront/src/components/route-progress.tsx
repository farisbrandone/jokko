'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const NAV_EVENT = 'jokko:route-settled';
const SHOW_DELAY_MS = 150;
const SAFETY_TIMEOUT_MS = 8000;

/**
 * Signale la fin d'une navigation (changement de pathname OU de query) —
 * séparé du reste pour isoler `useSearchParams`, qui exige une frontière
 * <Suspense> côté Next.js App Router.
 */
function RouteWatcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(NAV_EVENT));
  }, [pathname, searchParams]);
  return null;
}

/**
 * Voile flouté + spinner affiché entre le clic sur un lien interne et
 * l'arrivée effective de la nouvelle page. Un léger délai évite le flash
 * sur les navigations instantanées ; un filet de sécurité évite un voile
 * bloqué si la navigation n'aboutit jamais (lien vers une simple ancre…).
 */
export function RouteProgress() {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    showTimer.current = null;
    safetyTimer.current = null;
  };

  useEffect(() => {
    const settle = () => {
      clearTimers();
      setVisible(false);
    };
    window.addEventListener(NAV_EVENT, settle);
    return () => window.removeEventListener(NAV_EVENT, settle);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;

      clearTimers();
      showTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      safetyTimer.current = setTimeout(() => setVisible(false), SAFETY_TIMEOUT_MS);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher />
      </Suspense>
      <div
        aria-hidden={!visible}
        className="route-progress"
        data-visible={visible ? 'true' : 'false'}
      >
        <div className="route-progress__spinner" role="status" aria-label="Chargement de la page">
          <svg viewBox="0 0 44 44" fill="none">
            <circle className="track" cx="22" cy="22" r="18" />
            <circle className="arc" cx="22" cy="22" r="18" />
          </svg>
        </div>
      </div>
    </>
  );
}
