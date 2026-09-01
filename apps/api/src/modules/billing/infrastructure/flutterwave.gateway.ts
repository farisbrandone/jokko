import { Logger } from '@nestjs/common';
import type { CheckoutRequest, PaymentGateway, VerifiedPayment } from '../domain/ports';

export interface FlutterwaveConfig {
  secretKey: string;
  webhookSecret: string;
  baseUrl: string;
}

/** Passerelle Flutterwave (flux « Standard » : lien de paiement hébergé). */
export class FlutterwaveGateway implements PaymentGateway {
  private readonly logger = new Logger('FlutterwaveGateway');

  constructor(private readonly cfg: FlutterwaveConfig) {}

  private headers() {
    return {
      authorization: `Bearer ${this.cfg.secretKey}`,
      'content-type': 'application/json',
    };
  }

  async createCheckout(req: CheckoutRequest): Promise<{ url: string }> {
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/v3/payments`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        tx_ref: req.txRef,
        amount: req.amount,
        currency: req.currency,
        redirect_url: req.returnUrl,
        customer: { email: req.email },
        meta: req.meta,
        customizations: { title: 'Abonnement Jokko' },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      data?: { link?: string };
      message?: string;
    };
    if (!res.ok || body.status !== 'success' || !body.data?.link) {
      throw new Error(`Flutterwave: ${body.message ?? res.status}`);
    }
    return { url: body.data.link };
  }

  async verifyByReference(txRef: string): Promise<VerifiedPayment> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
      txRef,
    )}`;
    const res = await fetch(url, { headers: this.headers() });
    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      data?: { status?: string; amount?: number; currency?: string; id?: number | string };
    };
    const d = body.data;
    if (!res.ok || body.status !== 'success' || !d) {
      this.logger.warn(`vérification Flutterwave échouée pour ${txRef}`);
      return { status: 'pending', amount: 0, currency: 'XOF', providerTxId: '' };
    }
    return {
      status: d.status === 'successful' ? 'successful' : d.status === 'failed' ? 'failed' : 'pending',
      amount: Number(d.amount ?? 0),
      currency: d.currency ?? 'XOF',
      providerTxId: String(d.id ?? ''),
    };
  }
}

/** Passerelle factice (dev / CI) : lien de retour direct, vérification toujours OK. */
export class FakePaymentGateway implements PaymentGateway {
  createCheckout(req: CheckoutRequest): Promise<{ url: string }> {
    const u = new URL(req.returnUrl);
    u.searchParams.set('tx_ref', req.txRef);
    u.searchParams.set('status', 'successful');
    return Promise.resolve({ url: u.toString() });
  }

  verifyByReference(txRef: string): Promise<VerifiedPayment> {
    return Promise.resolve({
      status: 'successful',
      amount: 0, // ignoré par le fake (voir apply-payment)
      currency: 'XOF',
      providerTxId: `fake-${txRef}`,
    });
  }
}
