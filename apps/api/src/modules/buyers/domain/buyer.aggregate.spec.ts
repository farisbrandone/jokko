import { describe, expect, it } from 'vitest';
import { Buyer, normalizeAddresses } from './buyer.aggregate';

describe('Buyer', () => {
  it('crée un compte sans nom ni adresse', () => {
    const buyer = Buyer.create({ phone: '+221770000000' });
    const s = buyer.toSnapshot();
    expect(s.phone).toBe('+221770000000');
    expect(s.name).toBeNull();
    expect(s.addresses).toEqual([]);
  });

  it('met à jour le nom et normalise les adresses', () => {
    const buyer = Buyer.create({ phone: '+221770000000' });
    buyer.updateProfile({
      name: 'Fatou',
      addresses: [
        { label: 'Maison', address: 'Rue 12, Dakar' },
        { label: '  Bureau  ', address: '  Plateau  ' },
      ],
    });
    const s = buyer.toSnapshot();
    expect(s.name).toBe('Fatou');
    expect(s.addresses).toHaveLength(2);
    expect(s.addresses[1]).toMatchObject({ label: 'Bureau', address: 'Plateau' });
    expect(s.addresses[0].id).toBeTruthy();
  });

  it("normalizeAddresses rejette les entrées vides et borne à 5", () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ label: `A${i}`, address: `X${i}` }));
    list.push({ label: '', address: 'ignorée' });
    const out = normalizeAddresses(list);
    expect(out).toHaveLength(5);
  });

  it('restore préserve les identifiants existants', () => {
    const buyer = Buyer.restore({
      id: 'b1',
      phone: '+221770000001',
      name: 'Ama',
      addresses: [{ id: 'addr-1', label: 'Maison', address: 'Rue 1' }],
      createdAt: new Date().toISOString(),
    });
    expect(buyer.addresses[0].id).toBe('addr-1');
    expect(buyer.name).toBe('Ama');
  });
});
