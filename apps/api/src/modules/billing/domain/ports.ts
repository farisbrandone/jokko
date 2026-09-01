import type { Subscription } from './subscription.aggregate';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
export interface SubscriptionRepository {
  find(shopId: string): Promise<Subscription | null>;
  save(sub: Subscription): Promise<void>;
  /** Abonnements dont la période (+ grâce) est échue et le statut encore vivant. */
  listLapsed(graceDays: number): Promise<Subscription[]>;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface PaymentRecord {
  id: string;
  shopId: string;
  txRef: string;
  providerTxId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export const PAYMENT_LOG_REPOSITORY = Symbol('PAYMENT_LOG_REPOSITORY');
export interface PaymentLogRepository {
  create(shopId: string, txRef: string, amount: number, currency: string): Promise<void>;
  findByTxRef(txRef: string): Promise<PaymentRecord | null>;
  markSucceeded(txRef: string, providerTxId: string): Promise<void>;
  markFailed(txRef: string): Promise<void>;
}

export interface CheckoutRequest {
  txRef: string;
  amount: number;
  currency: string;
  email: string;
  returnUrl: string;
  meta: Record<string, string>;
}

export interface VerifiedPayment {
  status: 'successful' | 'failed' | 'pending';
  amount: number;
  currency: string;
  providerTxId: string;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
export interface PaymentGateway {
  createCheckout(req: CheckoutRequest): Promise<{ url: string }>;
  verifyByReference(txRef: string): Promise<VerifiedPayment>;
}
