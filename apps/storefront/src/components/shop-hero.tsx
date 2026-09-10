import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ShopView } from '@/lib/api';

export async function ShopHero({
  shop,
  productCount,
}: {
  shop: ShopView;
  productCount: number;
}) {
  const t = await getTranslations('home');
  const title = shop.heroTitle?.trim() || shop.name;
  const subtitle =
    shop.heroSubtitle?.trim() ||
    `${t('tagline')} ${t('productsAvailable', { count: productCount })}`;

  if (shop.heroImageUrl) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius-card)]">
        <Image
          src={shop.heroImageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative flex min-h-[240px] flex-col justify-end gap-2 p-6 text-white sm:min-h-[300px] sm:p-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold drop-shadow-sm sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-soft)] px-5 py-9 sm:px-8 sm:py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--color-muted)]">{subtitle}</p>
    </section>
  );
}
