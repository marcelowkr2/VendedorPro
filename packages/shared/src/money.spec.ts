import { toCents, fromCents, formatBRL, addCents, subtotalCents, discountCents, totalCents, marginPercent } from './money';

describe('money helpers', () => {
  it('toCents converte corretamente', () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents('12.34')).toBe(1234);
    expect(toCents(0.01)).toBe(1);
  });

  it('fromCents converte corretamente', () => {
    expect(fromCents(1000)).toBe(10);
    expect(fromCents(1234)).toBe(12.34);
  });

  it('formatBRL exibe valor', () => {
    expect(formatBRL(1000)).toContain('10');
  });

  it('addCents soma', () => {
    expect(addCents(100, 200, 300)).toBe(600);
  });

  it('subtotalCents soma itens', () => {
    expect(subtotalCents([
      { priceCents: 100, quantity: 2 },
      { priceCents: 50, quantity: 3 },
    ])).toBe(350);
  });

  it('discountCents limita ao subtotal', () => {
    expect(discountCents(100, 50)).toBe(50);
    expect(discountCents(100, 200)).toBe(100);
  });

  it('totalCents', () => {
    expect(totalCents(100, 30)).toBe(70);
    expect(totalCents(50, 100)).toBe(0);
  });

  it('marginPercent', () => {
    expect(marginPercent(1000, 700)).toBe(30);
    expect(marginPercent(0, 100)).toBe(0);
  });
});