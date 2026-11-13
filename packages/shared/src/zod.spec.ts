import { productInputSchema, customerInputSchema, loginSchema, paginationSchema } from './zod';

describe('zod schemas', () => {
  it('productInputSchema', () => {
    const r = productInputSchema.safeParse({
      name: 'Notebook', code: 'NB001', priceCents: 1000, costCents: 800, stock: 5,
    });
    expect(r.success).toBe(true);
  });

  it('productInputSchema falha sem priceCents', () => {
    const r = productInputSchema.safeParse({ name: 'X', code: 'Y' });
    expect(r.success).toBe(false);
  });

  it('customerInputSchema', () => {
    const r = customerInputSchema.safeParse({ name: 'João', cpfCnpj: '11111111111' });
    expect(r.success).toBe(true);
  });

  it('loginSchema', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '123456' });
    expect(r.success).toBe(true);
  });

  it('paginationSchema defaults', () => {
    const r = paginationSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.sortOrder).toBe('desc');
  });
});