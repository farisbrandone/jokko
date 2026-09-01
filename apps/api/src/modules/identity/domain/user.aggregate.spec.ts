import { describe, expect, it } from 'vitest';
import { User, syntheticEmailForPhone } from './user.aggregate';

describe('User', () => {
  it('create : e-mail normalisé, sans téléphone ni admin', () => {
    const u = User.create({
      email: '  Awa@Ex.COM ',
      name: ' Awa ',
      passwordHash: 'h',
    }).unwrap();
    const s = u.toSnapshot();
    expect(s.email).toBe('awa@ex.com');
    expect(s.phone).toBeNull();
    expect(s.passwordHash).toBe('h');
    expect(s.isPlatformAdmin).toBe(false);
  });

  it('createWithPhone : e-mail synthétique, mot de passe nul', () => {
    const u = User.createWithPhone({ phone: '+221771234567', name: 'Moussa' }).unwrap();
    const s = u.toSnapshot();
    expect(s.phone).toBe('+221771234567');
    expect(s.email).toBe(syntheticEmailForPhone('+221771234567'));
    expect(s.passwordHash).toBeNull();
    expect(s.name).toBe('Moussa');
  });

  it('createWithPhone : nom vide → « Client », numéro invalide → erreur', () => {
    expect(User.createWithPhone({ phone: '+221771234567', name: '  ' }).unwrap().name).toBe(
      'Client',
    );
    expect(User.createWithPhone({ phone: '0771234567', name: 'X' }).isErr).toBe(true);
  });
});
