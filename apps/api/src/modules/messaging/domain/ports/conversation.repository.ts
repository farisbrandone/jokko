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
}

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');
