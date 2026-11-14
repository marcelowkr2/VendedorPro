import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/app.exception';
import { audit } from '../../audit';
import PDFDocument from 'pdfkit';

const orderStatusLabels: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Aberto',
  approved: 'Aprovado',
  separating: 'Em separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100).replace(/\u00a0/g, ' ');

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
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true, code: true, tenantId: true } } } },
      },
    });
    if (!order) throw new NotFoundError();
    if ((order.customer && order.customer.tenantId !== tenantId) || order.items.some((item) => item.product.tenantId !== tenantId)) {
      throw new ValidationError('Pedido contém dados de outra empresa');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text(`VendedorPro - Pedido ${order.number}`);
      doc.moveDown().fontSize(11);
      doc.text(`Cliente: ${order.customer?.name || 'Não informado'}`);
      doc.text(`Data: ${order.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
      doc.text(`Status: ${orderStatusLabels[order.status] ?? order.status}`);
      doc.moveDown().fontSize(13).text('Itens');
      doc.moveDown(0.5).fontSize(11);
      for (const item of order.items) {
        doc.text(`${item.product.name} (${item.product.code})`);
        doc.text(`Quantidade: ${item.quantity}  |  Unitário: ${formatMoney(item.priceCents)}  |  Total: ${formatMoney(item.priceCents * item.quantity)}`);
        doc.moveDown(0.5);
      }
      doc.moveDown(0.5);
      doc.text(`Subtotal: ${formatMoney(order.subtotalCents)}`);
      doc.text(`Desconto: ${formatMoney(order.discountCents)}`);
      doc.font('Helvetica-Bold').text(`Total: ${formatMoney(order.totalCents)}`);
      doc.end();
    });
  }
}