import { describe, expect, it } from 'vitest';
import { parseProductPage } from './url-fetcher';
import { parseProductCsv } from './csv-parser';

describe('parseProductPage', () => {
  it('extrait un produit depuis un JSON-LD', () => {
    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Casque sans fil',
        description: 'Bluetooth 5.3',
        image: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
        offers: { '@type': 'Offer', price: '19.99', priceCurrency: 'EUR' },
      })}</script>
    </head><body></body></html>`;
    const d = parseProductPage(html, 'XOF');
    expect(d.name).toBe('Casque sans fil');
    expect(d.priceAmount).toBe(1999);
    expect(d.currency).toBe('EUR');
    expect(d.images).toEqual(['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg']);
  });

  it('retombe sur les balises OpenGraph', () => {
    const html = `<html><head>
      <meta property="og:title" content="Sac à main" />
      <meta property="og:description" content="Cuir véritable" />
      <meta property="og:image" content="https://img.example.com/sac.jpg" />
      <meta property="product:price:amount" content="45000" />
      <meta property="product:price:currency" content="XOF" />
    </head></html>`;
    const d = parseProductPage(html, 'XOF');
    expect(d.name).toBe('Sac à main');
    expect(d.priceAmount).toBe(4_500_000);
    expect(d.images).toEqual(['https://img.example.com/sac.jpg']);
  });

  it('lève si aucun nom trouvé', () => {
    expect(() => parseProductPage('<html><body>rien</body></html>', 'XOF')).toThrow();
  });
});

describe('parseProductCsv', () => {
  it('mappe les colonnes (alias FR/EN) et convertit le prix', () => {
    const csv = [
      'nom,prix,stock,catégorie,image',
      'Théière,"12,50",4,Maison,https://x/y.jpg',
      '"Tasse, grande",8.00,0,Maison,',
    ].join('\n');
    const rows = parseProductCsv(csv, 'XOF');
    expect(rows).toHaveLength(2);
    expect(rows[0].draft).toMatchObject({ name: 'Théière', priceAmount: 1250, stock: 4 });
    expect(rows[1].draft).toMatchObject({ name: 'Tasse, grande', priceAmount: 800, stock: 0 });
  });

  it('signale les lignes invalides et l’en-tête incomplet', () => {
    expect(parseProductCsv('titre,couleur\nX,rouge', 'XOF')[0].error).toMatch(/name.*price/i);
    const rows = parseProductCsv('name,price\n,10\nBon,abc', 'XOF');
    expect(rows[0].error).toBe('nom manquant');
    expect(rows[1].error).toBe('prix invalide');
  });
});
