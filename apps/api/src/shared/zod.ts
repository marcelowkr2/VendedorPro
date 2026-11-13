import { z } from 'zod';

export const productInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  barcode: z.string().optional(),
  priceCents: z.number().nonnegative(),
  costCents: z.number().nonnegative().optional(),
  stock: z.number().nonnegative().optional(),
  minStock: z.number().nonnegative().optional(),
  unit: z.string().optional(),
});

export const customerInputSchema = z.object({
  name: z.string().min(1),
  cpfCnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});