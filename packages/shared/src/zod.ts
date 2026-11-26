import { z } from 'zod';

export const productInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  barcode: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
});

export const customerInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  cpfCnpj: z.string().trim().max(18).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

export const orderInputSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    priceCents: z.number().int().nonnegative(),
  })).min(1),
  discountCents: z.number().int().nonnegative().optional(),
});

export const quoteInputSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    priceCents: z.number().int().nonnegative(),
  })).min(1),
  discountCents: z.number().int().nonnegative().optional(),
  validUntil: z.string().datetime().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int().nonnegative(),
  reason: z.string().max(500).optional(),
}).refine((data) => data.type === 'adjustment' || data.quantity > 0, {
  path: ['quantity'],
  message: 'A quantidade deve ser maior que zero para entradas e saídas',
});

export const paymentInputSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(['pix', 'boleto', 'credit_card', 'debit_card', 'cash']).optional(),
});

export const tenantCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const paginationSchema = z.object({
  page: z.coerce.number().positive().optional().default(1),
  pageSize: z.coerce.number().positive().max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});