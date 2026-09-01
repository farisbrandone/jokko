import { Inject, Injectable } from '@nestjs/common';
import type { PushSubscriptionInput } from '@jokko/contracts';
import {
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSender,
  type PushSubscriptionRepository,
} from '../domain/ports';

@Injectable()
export class PushService {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly repo: PushSubscriptionRepository,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  publicKey(): string | null {
    return this.sender.publicKey;
  }

  subscribe(userId: string, sub: PushSubscriptionInput, userAgent?: string): Promise<void> {
    return this.repo.upsert(
      userId,
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      userAgent,
    );
  }

  unsubscribe(userId: string, endpoint: string): Promise<void> {
    return this.repo.removeForUser(userId, endpoint);
  }
}
