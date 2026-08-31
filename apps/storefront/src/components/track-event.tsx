'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track';

/** Envoie `page_view` à chaque navigation. À monter une fois dans le layout. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track('page_view', { path: pathname });
  }, [pathname]);
  return null;
}

/** Événement ponctuel (product_view, search…) déclenché au montage. */
export function TrackOnMount({
  name,
  props,
}: {
  name: string;
  props: Record<string, string | number | boolean>;
}) {
  useEffect(() => {
    track(name, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
