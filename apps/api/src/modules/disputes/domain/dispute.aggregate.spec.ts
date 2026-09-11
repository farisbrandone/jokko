import { describe, expect, it } from 'vitest';
import { Dispute } from './dispute.aggregate';

const base = { shopId: 's1', orderId: 'o1', buyerPhone: '+221770000000' } as const;

describe('Dispute', () => {
  it("s'ouvre à l'état « open »", () => {
    const d = Dispute.open({ ...base, reason: 'not_received', description: 'Jamais reçu ma commande' });
    const s = d.toSnapshot();
    expect(s.status).toBe('open');
    expect(s.sellerResponse).toBeNull();
    expect(s.resolution).toBeNull();
    expect(d.canRespond).toBe(true);
    expect(d.canEscalate).toBe(true);
    expect(d.isActive).toBe(true);
  });

  it('respond sans résolution → seller_responded ; avec résolution → resolved', () => {
    const d = Dispute.open({ ...base, reason: 'damaged', description: 'Produit cassé à la livraison' });
    d.respond({ response: 'On vous recontacte' });
    expect(d.toSnapshot().status).toBe('seller_responded');
    expect(d.canRespond).toBe(true); // peut encore répondre / proposer une résolution

    d.respond({ response: 'Remboursement accepté', resolution: 'refund', resolutionNote: 'Viré ce jour' });
    const s = d.toSnapshot();
    expect(s.status).toBe('resolved');
    expect(s.resolution).toBe('refund');
    expect(d.isActive).toBe(false);
    expect(d.canRespond).toBe(false);
    expect(d.canEscalate).toBe(false);
  });

  it("escalate transmet à la plateforme, canRespond/canEscalate deviennent faux", () => {
    const d = Dispute.open({ ...base, reason: 'wrong_item', description: 'Ce n’est pas le bon article' });
    d.escalate('Le vendeur ne répond plus');
    const s = d.toSnapshot();
    expect(s.status).toBe('escalated');
    expect(s.escalationNote).toBe('Le vendeur ne répond plus');
    expect(s.escalatedAt).toBeTruthy();
    expect(d.canRespond).toBe(false);
    expect(d.canEscalate).toBe(false);
    expect(d.isActive).toBe(true); // pas encore clos : en attente de médiation
  });

  it('mediate clôture le litige avec la résolution de la plateforme', () => {
    const d = Dispute.open({ ...base, reason: 'other', description: 'Litige quelconque suffisamment long' });
    d.escalate();
    d.mediate('replacement', 'Renvoi du produit organisé');
    const s = d.toSnapshot();
    expect(s.status).toBe('closed');
    expect(s.resolution).toBe('replacement');
    expect(s.adminNote).toBe('Renvoi du produit organisé');
    expect(s.closedAt).toBeTruthy();
    expect(d.isActive).toBe(false);
  });

  it('restore reconstruit un litige clos à partir d’un instantané', () => {
    const original = Dispute.open({ ...base, reason: 'not_as_described', description: 'Pas conforme à la fiche' });
    original.escalate();
    original.mediate('rejected', 'Preuve insuffisante');
    const restored = Dispute.restore(original.toSnapshot());
    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
    expect(restored.isActive).toBe(false);
  });
});
