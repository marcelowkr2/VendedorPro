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
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, limit = 50) {
    return this.prisma.quote.findMany({
      where: { tenantId },
      include: { items: true, customer: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: any, sellerId: string) {
    const items = data.items;
    if (!data.customerId || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Orçamento exige um cliente e pelo menos um item');
    }

    const subtotal = items.reduce((sum: number, item: any) => {
      const lineTotal = item.priceCents * item.quantity;
      if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(sum + lineTotal)) {
        throw new ValidationError('O total do orçamento excede o limite suportado');
      }
      return sum + lineTotal;
    });
    const discount = data.discountCents ?? 0;
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > subtotal) {
      throw new ValidationError('Desconto inválido para o valor do orçamento');
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, tenantId, active: true },
      });
      if (!customer) throw new NotFoundError('Cliente não encontrado nesta empresa');

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId, active: true },
          select: { id: true },
        });
        if (!product) throw new NotFoundError(`Produto ${item.productId} não encontrado nesta empresa`);
      }

      const year = new Date().getFullYear();
      const sequence = await tx.documentSequence.upsert({
        where: { tenantId_year_kind: { tenantId, year, kind: 'quote' } },
        create: { tenantId, year, kind: 'quote', value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = `ORC-${year}-${String(sequence.value).padStart(5, '0')}`;

      const quote = await tx.quote.create({
        data: {
          tenantId,
          number,
          customerId: data.customerId,
          sellerId,
          status: 'draft',
          subtotalCents: subtotal,
          discountCents: discount,
          totalCents: subtotal - discount,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
            })),
          },
        },
        include: { items: true },
      });
      await audit(tx, 'QUOTE_CREATE', tenantId, quote.id, null, quote, sellerId);
      return quote;
    });
  }

  async findOne(tenantId: string, id: string) {
    const q = await this.prisma.quote.findFirst({
      where: { id, tenantId },
      include: { items: true, customer: true },
    });
    if (!q) throw new NotFoundError();
    return q;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const allowedStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired', 'converted'];
    if (!allowedStatuses.includes(status)) throw new ValidationError('Status de orçamento inválido');
    const before = await this.findOne(tenantId, id);
    const updated = await this.prisma.quote.update({ where: { id, tenantId }, data: { status } });
    await audit(this.prisma, 'QUOTE_STATUS_UPDATE', tenantId, id, before, updated);
    return updated;
  }

  async convertToOrder(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: { id, tenantId, active: true },
        include: { items: true },
      });
      if (!quote) throw new NotFoundError();
      if (quote.status !== 'draft' && quote.status !== 'approved') {
        throw new ValidationError('Orçamento não pode ser convertido neste status');
      }
      if (!quote.customerId) throw new ValidationError('Orçamento sem cliente não pode ser convertido');

      const customer = await tx.customer.findFirst({
        where: { id: quote.customerId, tenantId, active: true },
      });
      if (!customer) throw new NotFoundError('Cliente não encontrado nesta empresa');

      const conversionStarted = await tx.quote.updateMany({
        where: { id, tenantId, active: true, status: { in: ['draft', 'approved'] } },
        data: { status: 'converted' },
      });
      if (conversionStarted.count !== 1) {
        throw new ConflictError('O orçamento foi convertido por outra operação');
      }

      for (const item of quote.items) {
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

      const year = new Date().getFullYear();
      const sequence = await tx.documentSequence.upsert({
        where: { tenantId_year_kind: { tenantId, year, kind: 'order' } },
        create: { tenantId, year, kind: 'order', value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = `PED-${year}-${String(sequence.value).padStart(5, '0')}`;
      const order = await tx.order.create({
        data: {
          tenantId,
          sellerId: quote.sellerId,
          number,
          customerId: quote.customerId,
          status: 'separating',
          subtotalCents: quote.subtotalCents,
          discountCents: quote.discountCents,
          totalCents: quote.totalCents,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of quote.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            tenantId,
            type: 'out',
            quantity: item.quantity,
            reason: `Pedido ${number} convertido do orçamento ${quote.number}`,
          },
        });
      }
      const updatedQuote = await tx.quote.findUniqueOrThrow({ where: { id } });
      await audit(tx, 'QUOTE_CONVERT', tenantId, quote.id, quote, updatedQuote, quote.sellerId ?? undefined);
      return order;
    });
  }

  async generatePdf(tenantId: string, id: string) {
    const q = await this.findOne(tenantId, id);
    const lines: string[] = [
      `VendedorPro - Orçamento ${q.number}`,
      `Cliente: ${q.customer?.name || '—'}`,
      `Status: ${q.status}`,
      `Total: R$ ${(q.totalCents / 100).toFixed(2)}`,
      '',
      'Itens:',
      ...q.items.map((i: any) => ` - ${i.productId} qtd=${i.quantity} R$ ${(i.priceCents / 100).toFixed(2)}`),
    ];

    // Minimal PDF binary (text-only placeholder) so frontend can download/open
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