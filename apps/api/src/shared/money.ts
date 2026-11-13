export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function subtotalCents(items: { priceCents: number; quantity: number }[]): number {
  return items.reduce((a, i) => a + i.priceCents * i.quantity, 0);
}

export function discountCents(subtotal: number, discount: number): number {
  return Math.max(0, Math.min(discount, subtotal));
}

export function totalCents(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

export function marginPercent(priceCents: number, costCents: number): number {
  if (!priceCents) return 0;
  return Math.round(((priceCents - costCents) / priceCents) * 10000) / 100;
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}