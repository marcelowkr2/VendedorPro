import { toCents, fromCents, subtotalCents, discountCents, totalCents, marginPercent } from './money';

describe('api money helpers', () => {
  it('toCents/fromCents', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(fromCents(1999)).toBe(19.99);
  });

  it('subtotalCents', () => {
    expect(subtotalCents([{ priceCents: 100, quantity: 3 }])).toBe(300);
  });

  it('discountCents', () => {
    expect(discountCents(500, 200)).toBe(200);
    expect(discountCents(500, 999)).toBe(500);
  });

  it('totalCents', () => {
    expect(totalCents(500, 200)).toBe(300);
  });

  it('marginPercent', () => {
    expect(marginPercent(1000, 600)).toBe(40);
    expect(marginPercent(1000, 0)).toBe(100);
  });
});