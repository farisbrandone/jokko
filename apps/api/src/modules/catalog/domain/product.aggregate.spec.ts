import { describe, expect, it } from 'vitest';
import { Product } from './product.aggregate';
import { Money } from './value-objects/money';

const priceXof = (amount: number) => Money.create(amount, 'XOF').unwrap();

describe('Product (agrégat)', () => {
  it('se crée avec un slug dérivé du nom et émet product.created', () => {
    const result = Product.create({
      shopId: 'shop-1',
      name: 'Casque Bluetooth JBL',
      category: 'electronique',
      price: priceXof(15000),
    });

    expect(result.isOk).toBe(true);
    const product = result.unwrap();
    expect(product.slug).toBe('casque-bluetooth-jbl');

    const events = product.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('catalog.product.created');
    expect(events[0].cacheTags).toContain('shop:shop-1:catalog');
  });

  it('refuse un nom vide', () => {
    const result = Product.create({
      shopId: 'shop-1',
      name: '   ',
      category: 'electronique',
      price: priceXof(1000),
    });
    expect(result.isErr).toBe(true);
  });

  it('refuse la publication sans image', () => {
    const product = Product.create({
      shopId: 'shop-1',
      name: 'Ventilateur',
      category: 'maison-cuisine',
      price: priceXof(22000),
    }).unwrap();

    expect(product.publish().isErr).toBe(true);
  });

  it('publie quand au moins une image est présente et émet product.published', () => {
    const product = Product.create({
      shopId: 'shop-1',
      name: 'Ventilateur',
      category: 'maison-cuisine',
      price: priceXof(22000),
      images: ['https://cdn.example/img.jpg'],
    }).unwrap();
    product.pullDomainEvents(); // vide product.created

    expect(product.publish().isOk).toBe(true);
    expect(product.toSnapshot().status).toBe('published');
    expect(product.pullDomainEvents()[0].name).toBe('catalog.product.published');
  });

  it("borne l'appartenance à une boutique", () => {
    const product = Product.create({
      shopId: 'shop-1',
      name: 'Article',
      category: 'sport',
      price: priceXof(500),
    }).unwrap();
    expect(product.belongsTo('shop-1')).toBe(true);
    expect(product.belongsTo('shop-2')).toBe(false);
  });
});
