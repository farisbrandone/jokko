'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'jokko_install_dismissed';

export function InstallPrompt() {
  const t = useTranslations('install');
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* stockage indisponible */
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!evt) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setEvt(null);
  };

  const install = async () => {
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    setEvt(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm shadow-lg">
      <span className="flex-1">{t('text')}</span>
      <button
        onClick={dismiss}
        className="rounded-[var(--radius-btn)] px-2 py-1 text-xs text-[var(--color-muted)]"
      >
        {t('dismiss')}
      </button>
      <button
        onClick={install}
        className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-ink)]"
      >
        {t('action')}
      </button>
    </div>
  );
}
