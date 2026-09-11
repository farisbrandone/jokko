import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Buyer } from '@jokko/contracts';
import { buyerJson } from '@/lib/buyer-api';
import { BuyerLoginForm } from '@/components/buyer-login-form';
import { BuyerAccount } from '@/components/buyer-account';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

export default async function AccountPage() {
  const t = await getTranslations('account');
  const buyer = await buyerJson<Buyer>('/buyer/me');

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">{t('title')}</h1>
      <div className="mt-6">
        {buyer ? <BuyerAccount initial={buyer} /> : <BuyerLoginForm />}
      </div>
    </div>
  );
}
