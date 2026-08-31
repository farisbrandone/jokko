import { z } from 'zod';
import { IdSchema, paginated } from './common';

export const ConversationStatusSchema = z.enum(['open', 'closed']);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const MessageSenderSchema = z.enum(['buyer', 'seller']);
export type MessageSender = z.infer<typeof MessageSenderSchema>;

export const MessageSchema = z.object({
  id: IdSchema,
  sender: MessageSenderSchema,
  body: z.string().min(1).max(4000),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: IdSchema,
  shopId: IdSchema,
  buyerName: z.string().min(1).max(80),
  buyerPhone: z.string().min(3).max(20),
  buyerEmail: z.string().email().nullable(),
  productId: IdSchema.nullable(),
  productName: z.string().nullable(),
  status: ConversationStatusSchema,
  lastMessageAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationWithMessagesSchema = ConversationSchema.extend({
  messages: z.array(MessageSchema),
});
export type ConversationWithMessages = z.infer<typeof ConversationWithMessagesSchema>;

/** Ouverture d'une conversation depuis la vitrine (acheteur, public). */
export const StartConversationSchema = z.object({
  buyerName: z.string().trim().min(1).max(80),
  buyerPhone: z.string().trim().min(3).max(20),
  buyerEmail: z.string().email().optional(),
  productId: IdSchema.optional(),
  productName: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(4000),
});
export type StartConversationInput = z.infer<typeof StartConversationSchema>;

export const PostMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});
export type PostMessageInput = z.infer<typeof PostMessageSchema>;

export const ConversationListSchema = paginated(ConversationSchema);
export type ConversationList = z.infer<typeof ConversationListSchema>;

/** Réponse à l'ouverture : id + jeton acheteur pour suivre le fil sans compte. */
export const StartedConversationSchema = z.object({
  conversationId: IdSchema,
  buyerToken: z.string(),
});
export type StartedConversation = z.infer<typeof StartedConversationSchema>;
