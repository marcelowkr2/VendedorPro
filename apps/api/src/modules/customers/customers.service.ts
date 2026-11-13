import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictError, NotFoundError } from '../../common/exceptions/app.exception';
import { audit } from '../../audit';
import type { customerInputSchema } from '@vendedorpro/shared';
import type { z } from 'zod';

type CustomerInput = z.infer<typeof customerInputSchema>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, q?: string, limit = 50) {
    return this.prisma.customer.findMany({
      where: { tenantId, active: true, ...(q ? { name: { contains: q } } : {}) },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: CustomerInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      if (data.cpfCnpj) {
        const existing = await tx.customer.findFirst({ where: { tenantId, cpfCnpj: data.cpfCnpj } });
        if (existing) throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      const customer = await tx.customer.create({
        data: {
          tenantId,
          name: data.name,
          cpfCnpj: data.cpfCnpj || null,
          email: data.email || null,
          phone: data.phone || null,
        },
      });
      await audit(tx, 'CUSTOMER_CREATE', tenantId, customer.id, null, customer, actorId);
      return customer;
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundError();
    return c;
  }

  async update(tenantId: string, id: string, data: Partial<CustomerInput>, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.customer.findFirst({ where: { id, tenantId, active: true } });
      if (!before) throw new NotFoundError('Cliente não encontrado');
      if (data.cpfCnpj && data.cpfCnpj !== before.cpfCnpj) {
        const duplicate = await tx.customer.findFirst({
          where: { tenantId, cpfCnpj: data.cpfCnpj, NOT: { id } },
        });
        if (duplicate) throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      const customer = await tx.customer.update({
        where: { id, tenantId },
        data: {
          name: data.name,
          cpfCnpj: data.cpfCnpj === undefined ? undefined : data.cpfCnpj || null,
          email: data.email === undefined ? undefined : data.email || null,
          phone: data.phone === undefined ? undefined : data.phone || null,
        },
      });
      await audit(tx, 'CUSTOMER_UPDATE', tenantId, id, before, customer, actorId);
      return customer;
    });
  }

  async remove(tenantId: string, id: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.customer.findFirst({ where: { id, tenantId, active: true } });
      if (!before) throw new NotFoundError('Cliente não encontrado');
      const [orders, quotes, receivables] = await Promise.all([
        tx.order.findFirst({ where: { customerId: id, tenantId }, select: { id: true } }),
        tx.quote.findFirst({ where: { customerId: id, tenantId }, select: { id: true } }),
        tx.accountsReceivable.findFirst({ where: { customerId: id, tenantId }, select: { id: true } }),
      ]);
      if (orders || quotes || receivables) {
        throw new ConflictError('Cliente possui pedidos, orçamentos ou contas a receber vinculados');
      }
      const customer = await tx.customer.update({ where: { id, tenantId }, data: { active: false } });
      await audit(tx, 'CUSTOMER_DELETE', tenantId, id, before, customer, actorId);
      return customer;
    });
  }
}