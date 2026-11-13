import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/app.exception';
import { audit } from '../../audit';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, limit = 50) {
    return this.prisma.order.findMany({
      where: { tenantId, active: true },
      include: { items: true, customer: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: any, sellerId: string) {
    const items = data.items;
    if (!data.customerId || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Pedido exige um cliente e pelo menos um item');
    }

    const subtotal = items.reduce((sum: number, item: any) => {
      const lineTotal = item.priceCents * item.quantity;
      if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(sum + lineTotal)) {
        throw new ValidationError('O total do pedido excede o limite suportado');
      }
      return sum + lineTotal;
    }, 0);
    const discount = data.discountCents ?? 0;
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > subtotal) {
      throw new ValidationError('Desconto inválido para o valor do pedido');
    }
    const total = subtotal - discount;

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, tenantId, active: true },
      });
      if (!customer) throw new NotFoundError('Cliente não encontrado nesta empresa');

      const year = new Date().getFullYear();
      const sequence = await tx.documentSequence.upsert({
        where: { tenantId_year_kind: { tenantId, year, kind: 'order' } },
        create: { tenantId, year, kind: 'order', value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = `PED-${year}-${String(sequence.value).padStart(5, '0')}`;

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId, active: true },
          select: { id: true },
        });
        if (!product) throw new NotFoundError(`Produto ${item.productId} não encontrado nesta empresa`);

        const stockUpdated = await tx.product.updateMany({
          where: { id: item.productId, tenantId, active: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (stockUpdated.count !== 1) throw new InsufficientStockError();
      }

      const order = await tx.order.create({
        data: {
          tenantId,
          number,
          customerId: data.customerId,
          sellerId,
          status: 'separating',
          subtotalCents: subtotal,
          discountCents: discount,
          totalCents: total,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              priceCents: i.priceCents,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            tenantId,
            type: 'out',
            quantity: item.quantity,
            reason: `Pedido ${number}`,
          },
        });
      }

      await audit(tx, 'ORDER_CREATE', tenantId, order.id, null, order, sellerId);
      return order;
    });
  }

  async findOne(tenantId: string, id: string) {
    const o = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { items: true, customer: true },
    });
    if (!o) throw new NotFoundError();
    return o;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const allowedStatuses = ['draft', 'open', 'approved', 'separating', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) throw new ValidationError('Status de pedido inválido');

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, tenantId, active: true },
        include: { items: true },
      });
      if (!order) throw new NotFoundError();

      const statusUpdated = await tx.order.updateMany({
        where: { id, tenantId, active: true, status: order.status },
        data: { status },
      });
      if (statusUpdated.count !== 1) throw new ConflictError('O pedido foi alterado por outra operação');

      if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId, tenantId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              tenantId,
              type: 'in',
              quantity: item.quantity,
              reason: `Cancelamento pedido ${order.number}`,
            },
          });
        }
      }
      const updated = await tx.order.findUniqueOrThrow({ where: { id } });
      await audit(tx, 'ORDER_STATUS_UPDATE', tenantId, id, order, updated);
      return updated;
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, tenantId, active: true },
        include: { items: true },
      });
      if (!order) throw new NotFoundError();

      const deactivated = await tx.order.updateMany({
        where: { id, tenantId, active: true },
        data: { active: false },
      });
      if (deactivated.count !== 1) throw new ConflictError('O pedido foi alterado por outra operação');

      if (order.status !== 'cancelled') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId, tenantId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              tenantId,
              type: 'in',
              quantity: item.quantity,
              reason: `Exclusão pedido ${order.number}`,
            },
          });
        }
      }
      const updated = await tx.order.findUniqueOrThrow({ where: { id } });
      await audit(tx, 'ORDER_DELETE', tenantId, id, order, updated);
      return updated;
    });
  }

  async generatePdf(tenantId: string, id: string) {
    const o = await this.findOne(tenantId, id);
    const lines: string[] = [
      `VendedorPro - Pedido ${o.number}`,
      `Cliente: ${o.customer?.name || '—'}`,
      `Status: ${o.status}`,
      `Total: R$ ${(o.totalCents / 100).toFixed(2)}`,
      '',
      'Itens:',
      ...o.items.map((i: any) => ` - ${i.productId} qtd=${i.quantity} R$ ${(i.priceCents / 100).toFixed(2)}`),
    ];

    const header = '%PDF-1.4\n';
    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const text = lines.join('\\n');
    const page = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n`;
    const stream = `4 0 obj\n<< /Length ${Buffer.byteLength(text)} >>\nstream\nBT /F1 12 Tf 50 700 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET\nendstream\nendobj\n`;
    const xref =
      'xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000066 00000 n \n0000000117 00000 n \n0000000190 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + Buffer.byteLength(header + obj1 + obj2 + page + stream) + '\n%%EOF\n';
    return Buffer.concat([
      Buffer.from(header),
      Buffer.from(obj1),
      Buffer.from(obj2),
      Buffer.from(page),
      Buffer.from(stream),
      Buffer.from(xref),
    ]);
  }
}