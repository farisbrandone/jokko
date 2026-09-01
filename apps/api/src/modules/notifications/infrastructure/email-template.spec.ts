import { describe, expect, it } from 'vitest';
import { renderEmail } from './email-template';

describe('renderEmail', () => {
  it('produit un HTML avec titre, corps, citation et bouton', () => {
    const { html } = renderEmail({
      title: 'Nouveau message sur Chez Awa',
      lines: ['Fatou vous a écrit à propos de « Sac » :'],
      quote: 'Bonjour, est-ce encore disponible ?',
      cta: { label: 'Répondre', url: 'https://jokko.shop/s/x/inbox/1' },
    });
    expect(html).toContain('<title>Nouveau message sur Chez Awa</title>');
    expect(html).toContain('<h1');
    expect(html).toContain('Bonjour, est-ce encore disponible ?');
    expect(html).toContain('href="https://jokko.shop/s/x/inbox/1"');
    expect(html).toContain('Répondre');
  });

  it('échappe le HTML injecté dans le contenu', () => {
    const { html } = renderEmail({
      title: 'Test',
      lines: ['<script>alert(1)</script>'],
      quote: '<img src=x onerror=alert(2)>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
  });

  it('fournit un repli texte brut cohérent', () => {
    const { text } = renderEmail({
      title: 'Nouveau message',
      lines: ['Ligne un', 'Ligne deux'],
      quote: 'aperçu',
      cta: { label: 'Ouvrir', url: 'https://ex.test/r' },
    });
    expect(text).toContain('Nouveau message');
    expect(text).toContain('Ligne un');
    expect(text).toContain('« aperçu »');
    expect(text).toContain('Ouvrir : https://ex.test/r');
    expect(text).not.toMatch(/<[a-z]/i);
  });
});
