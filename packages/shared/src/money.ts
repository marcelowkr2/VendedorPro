export type Cents = number;

export function toCents(value: number | string): Cents {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}

export function formatBRL(cents: Cents): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((a, v) => a + v, 0);
}

export function subtotalCents(items: { priceCents: Cents; quantity: number }[]): Cents {
  return items.reduce((a, i) => a + i.priceCents * i.quantity, 0);
}

export function discountCents(subtotal: Cents, discount: Cents): Cents {
  return Math.max(0, Math.min(discount, subtotal));
}

export function totalCents(subtotal: Cents, discount: Cents): Cents {
  return Math.max(0, subtotal - discount);
}

export function marginPercent(priceCents: Cents, costCents: Cents): number {
  if (!priceCents) return 0;
  return Math.round(((priceCents - costCents) / priceCents) * 10000) / 100;
}