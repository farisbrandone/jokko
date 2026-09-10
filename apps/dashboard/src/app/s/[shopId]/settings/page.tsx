import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { NotificationSettings, SessionUser, ShopProfile } from '@/lib/types';
import { Shell } from '@/components/shell';
import { NotificationSettingsForm } from '@/components/notification-settings-form';
import { ShopProfileForm } from '@/components/shop-profile-form';
import { PushToggle } from '@/components/push-toggle';
import { CustomDomainForm } from '@/components/custom-domain-form';
import { DirectoryOptInForm } from '@/components/directory-optin-form';
import { ShopCategoriesForm } from '@/components/shop-categories-form';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

export default async function SettingsPage({ params }: Params) {
  const { shopId } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  const membership = me.memberships.find((m) => m.shopId === shopId);
  if (!membership) redirect('/');

  const [settings, shop] = await Promise.all([
    apiJson<NotificationSettings>(`/shops/${shopId}/settings/notifications`),
    apiJson<ShopProfile>(`/shops/${membership.slug}`),
  ]);

  return (
    <Shell email={me.email}>
      <div className="mb-6">
        <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
          ← Boutique
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Réglages</h1>
      </div>

      <section className="mb-10">
        <h2 className="font-medium mb-1">Profil de la boutique</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Nom, contact et apparence de la vitrine partagée sur les réseaux.
        </p>
        <ShopProfileForm initial={shop} />
      </section>

      <section className="mb-10">
        <h2 className="font-medium mb-1">Catégories du catalogue</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Vos propres catégories, proposées à la création d&apos;un produit et
          utilisées comme filtres sur votre vitrine. L&apos;ordre est respecté.
        </p>
        <ShopCategoriesForm shopId={shopId} initial={shop.categories ?? []} />
      </section>

      <section className="mb-10">
        <h2 className="font-medium mb-1">Annuaire Jokko</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Rendez votre boutique visible sur la page d&apos;accueil publique de Jokko.
        </p>
        <DirectoryOptInForm initial={shop} />
      </section>

      <section className="mb-10">
        <h2 className="font-medium mb-1">Domaine personnalisé</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Servez la vitrine sur votre propre nom de domaine (certificat TLS
          automatique après vérification).
        </p>
        <CustomDomainForm shopId={shopId} />
      </section>

      <section>
        <h2 className="font-medium mb-1">Notifications</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Comment être prévenu quand un acheteur écrit à la boutique.
        </p>
        <div className="mb-4 max-w-lg">
          <PushToggle />
        </div>
        <NotificationSettingsForm shopId={shopId} initial={settings} />
      </section>
    </Shell>
  );
}
