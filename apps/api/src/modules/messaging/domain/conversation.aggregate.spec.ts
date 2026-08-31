import { describe, expect, it } from 'vitest';
import { Conversation } from './conversation.aggregate';

const start = () =>
  Conversation.start({
    shopId: 'shop-1',
    buyerName: 'Fatou',
    buyerPhone: '+221770000001',
    productId: 'p1',
    productName: 'Radio',
    firstMessage: 'Bonjour',
  }).unwrap().conversation;

describe('Conversation (agrégat)', () => {
  it('démarre ouverte avec un premier message acheteur + événements', () => {
    const { conversation, buyerToken } = Conversation.start({
      shopId: 'shop-1',
      buyerName: 'Fatou',
      buyerPhone: '+221770000001',
      firstMessage: 'Bonjour',
    }).unwrap();
    const view = conversation.toViewWithMessages();
    expect(view.status).toBe('open');
    expect(view.messages).toHaveLength(1);
    expect(view.messages[0].sender).toBe('buyer');
    expect(conversation.verifyBuyerToken(buyerToken)).toBe(true);
    expect(conversation.verifyBuyerToken('nope')).toBe(false);

    const events = conversation.pullDomainEvents().map((e) => e.name);
    expect(events).toEqual([
      'messaging.conversation.started',
      'messaging.message.sent',
    ]);
  });

  it('refuse un premier message vide', () => {
    const res = Conversation.start({
      shopId: 'shop-1',
      buyerName: 'Fatou',
      buyerPhone: '+221770000001',
      firstMessage: '   ',
    });
    expect(res.isErr).toBe(true);
  });

  it('une réponse acheteur rouvre une conversation close', () => {
    const conv = start();
    conv.close();
    expect(conv.toView().status).toBe('closed');
    conv.addBuyerMessage('Toujours dispo ?');
    expect(conv.toView().status).toBe('open');
  });

  it('borne la conversation à sa boutique', () => {
    const conv = start();
    expect(conv.belongsTo('shop-1')).toBe(true);
    expect(conv.belongsTo('shop-2')).toBe(false);
  });
});
