import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { PaymentLogRepository, PaymentRecord } from '../../domain/ports';
import { BillingPaymentEntity } from './billing.entity';

@Injectable()
export class MikroOrmPaymentLogRepository implements PaymentLogRepository {
  constructor(private readonly em: EntityManager) {}

  async create(shopId: string, txRef: string, amount: number, currency: string): Promise<void> {
    const em = this.em.fork();
    const row = new BillingPaymentEntity();
    row.shopId = shopId;
    row.txRef = txRef;
    row.amount = amount;
    row.currency = currency;
    row.status = 'pending';
    await em.persistAndFlush(row);
  }

  async findByTxRef(txRef: string): Promise<PaymentRecord | null> {
    const row = await this.em.fork().findOne(BillingPaymentEntity, { txRef });
    if (!row) return null;
    return {
      id: row.id,
      shopId: row.shopId,
      txRef: row.txRef,
      providerTxId: row.providerTxId,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
    };
  }

  async markSucceeded(txRef: string, providerTxId: string): Promise<void> {
    await this.em
      .fork()
      .nativeUpdate(
        BillingPaymentEntity,
        { txRef },
        { status: 'succeeded', providerTxId, updatedAt: new Date() },
      );
  }

  async markFailed(txRef: string): Promise<void> {
    await this.em
      .fork()
      .nativeUpdate(BillingPaymentEntity, { txRef }, { status: 'failed', updatedAt: new Date() });
  }
}
