import type { Conversation } from '../conversation.aggregate';

export interface ConversationPage {
  items: Conversation[];
  total: number;
}

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(shopId: string, id: string): Promise<Conversation | null>;
  findByShop(
    shopId: string,
    filter: { status?: 'open' | 'closed'; page: number; pageSize: number },
  ): Promise<ConversationPage>;
  /** Nombre de conversations ouvertes par ce numéro depuis `sinceMs` (anti-spam). */
  countRecentByBuyerPhone(shopId: string, buyerPhone: string, sinceMs: number): Promise<number>;
}

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');
