import type { Buyer } from './buyer.aggregate';

export const BUYER_REPOSITORY = Symbol('BUYER_REPOSITORY');

export interface BuyerRepository {
  findByPhone(phone: string): Promise<Buyer | null>;
  findById(id: string): Promise<Buyer | null>;
  save(buyer: Buyer): Promise<void>;
}
