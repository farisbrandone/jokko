import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AggregateRoot, Guard, Result, UniqueId } from '@jokko/domain-kernel';
import type {
  Conversation as ConversationView,
  ConversationStatus,
  ConversationWithMessages,
  Message as MessageView,
  MessageSender,
} from '@jokko/contracts';
import { ConversationStarted, MessageSent } from './conversation.events';

interface MessageRec {
  id: string;
  sender: MessageSender;
  body: string;
  createdAt: Date;
}

export interface ConversationSnapshot {
  id: string;
  shopId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  productId: string | null;
  productName: string | null;
  status: ConversationStatus;
  buyerTokenHash: string;
  lastMessageAt: string;
  createdAt: string;
  messages: { id: string; sender: MessageSender; body: string; createdAt: string }[];
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export class Conversation extends AggregateRoot {
  private constructor(
    id: UniqueId,
    private readonly shopId: string,
    private readonly buyerName: string,
    private readonly buyerPhone: string,
    private readonly buyerEmail: string | null,
    private readonly productId: string | null,
    private readonly productName: string | null,
    private _status: ConversationStatus,
    private readonly buyerTokenHash: string,
    private _lastMessageAt: Date,
    private readonly _createdAt: Date,
    private _messages: MessageRec[],
  ) {
    super(id);
  }

  static start(props: {
    shopId: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    productId?: string;
    productName?: string;
    firstMessage: string;
  }): Result<{ conversation: Conversation; buyerToken: string }> {
    const checks = Result.combine([
      Guard.againstEmpty(props.shopId, 'shopId'),
      Guard.againstEmpty(props.buyerName, 'buyerName'),
      Guard.againstEmpty(props.buyerPhone, 'buyerPhone'),
      Guard.againstEmpty(props.firstMessage, 'message'),
    ]);
    if (checks.isErr) return Result.err(String(checks.getError()));

    const token = randomBytes(24).toString('base64url');
    const now = new Date();
    const conv = new Conversation(
      UniqueId.create(),
      props.shopId,
      props.buyerName.trim(),
      props.buyerPhone.trim(),
      props.buyerEmail?.trim() ?? null,
      props.productId ?? null,
      props.productName ?? null,
      'open',
      sha256(token),
      now,
      now,
      [{ id: randomUUID(), sender: 'buyer', body: props.firstMessage.trim(), createdAt: now }],
    );
    conv.addDomainEvent(new ConversationStarted(conv.shopId, conv.id.value, conv.buyerName));
    conv.addDomainEvent(new MessageSent(conv.shopId, conv.id.value, 'buyer'));
    return Result.ok({ conversation: conv, buyerToken: token });
  }

  static restore(snap: ConversationSnapshot): Conversation {
    return new Conversation(
      UniqueId.create(snap.id),
      snap.shopId,
      snap.buyerName,
      snap.buyerPhone,
      snap.buyerEmail,
      snap.productId,
      snap.productName,
      snap.status,
      snap.buyerTokenHash,
      new Date(snap.lastMessageAt),
      new Date(snap.createdAt),
      snap.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })),
    );
  }

  private append(sender: MessageSender, body: string): Result<void> {
    const trimmed = body.trim();
    if (trimmed.length === 0) return Result.err('Message vide');
    const now = new Date();
    this._messages.push({ id: randomUUID(), sender, body: trimmed, createdAt: now });
    this._lastMessageAt = now;
    if (sender === 'buyer' && this._status === 'closed') this._status = 'open';
    this.addDomainEvent(new MessageSent(this.shopId, this.id.value, sender));
    return Result.ok(undefined);
  }

  addBuyerMessage(body: string): Result<void> {
    return this.append('buyer', body);
  }

  addSellerMessage(body: string): Result<void> {
    return this.append('seller', body);
  }

  close(): void {
    this._status = 'closed';
  }

  verifyBuyerToken(token: string): boolean {
    return sha256(token) === this.buyerTokenHash;
  }

  belongsTo(shopId: string): boolean {
    return this.shopId === shopId;
  }

  toSnapshot(): ConversationSnapshot {
    return {
      id: this.id.value,
      shopId: this.shopId,
      buyerName: this.buyerName,
      buyerPhone: this.buyerPhone,
      buyerEmail: this.buyerEmail,
      productId: this.productId,
      productName: this.productName,
      status: this._status,
      buyerTokenHash: this.buyerTokenHash,
      lastMessageAt: this._lastMessageAt.toISOString(),
      createdAt: this._createdAt.toISOString(),
      messages: this._messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  toView(): ConversationView {
    const s = this.toSnapshot();
    return {
      id: s.id,
      shopId: s.shopId,
      buyerName: s.buyerName,
      buyerPhone: s.buyerPhone,
      buyerEmail: s.buyerEmail,
      productId: s.productId,
      productName: s.productName,
      status: s.status,
      lastMessageAt: s.lastMessageAt,
      createdAt: s.createdAt,
    };
  }

  toViewWithMessages(): ConversationWithMessages {
    return { ...this.toView(), messages: this.toSnapshot().messages as MessageView[] };
  }
}
