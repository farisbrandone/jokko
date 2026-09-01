export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface StoredPushSubscription extends PushSubscriptionData {
  userId: string;
}

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');
export interface PushSubscriptionRepository {
  upsert(userId: string, sub: PushSubscriptionData, userAgent?: string): Promise<void>;
  removeForUser(userId: string, endpoint: string): Promise<void>;
  /** Purge un endpoint expiré (404/410 renvoyé par le service push). */
  removeStale(endpoint: string): Promise<void>;
  listForUsers(userIds: string[]): Promise<StoredPushSubscription[]>;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export const PUSH_SENDER = Symbol('PUSH_SENDER');
export interface PushSender {
  readonly publicKey: string | null;
  /** Renvoie true si distribué ; appelle `onGone(endpoint)` si l'abonnement est mort. */
  send(
    sub: PushSubscriptionData,
    payload: PushPayload,
    onGone: (endpoint: string) => void,
  ): Promise<boolean>;
}
