import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const monthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit',
});

function monthKey(date: Date) {
  const parts = monthFormatter.formatToParts(date);
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
}

function saoPauloMonthStart(year: number, month: number) {
  const midday = new Date(Date.UTC(year, month, 1, 12));
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', timeZoneName: 'shortOffset',
  }).formatToParts(midday).find((part) => part.type === 'timeZoneName')?.value;
  const match = offset?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) throw new Error('Não foi possível determinar o fuso horário de São Paulo');
  const minutes = (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '-' ? -1 : 1);
  return new Date(Date.UTC(year, month, 1) - minutes * 60_000);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string) {
    const [orders, products, customers] = await Promise.all([
      this.prisma.order.findMany({ where: { tenantId } }),
      this.prisma.product.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
    ]);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthOrders = orders.filter((o) => new Date(o.createdAt) >= monthStart);
    return {
      monthRevenueCents: monthOrders.reduce((a, o) => a + o.totalCents, 0),
      monthOrdersCount: monthOrders.length,
      productsCount: products.length,
      customersCount: customers.length,
      lowStockCount: products.filter((p) => p.stock <= p.minStock).length,
    };
  }

  async dashboardPerformance(tenantId: string) {
    const now = new Date();
    const [year, month] = monthKey(now).split('-').map(Number);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1 - (5 - index), 15));
      return {
        key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
        totalCents: 0,
        ordersCount: 0,
      };
    });
    const since = saoPauloMonthStart(year, month - 6);
    const orderWhere = { tenantId, active: true, status: { not: 'cancelled' }, createdAt: { gte: since, lte: now } };
    const [orders, productsCount, customersCount, products, bestSellers] = await Promise.all([
      this.prisma.order.findMany({ where: orderWhere, select: { createdAt: true, totalCents: true } }),
      this.prisma.product.count({ where: { tenantId, active: true } }),
      this.prisma.customer.count({ where: { tenantId, active: true } }),
      this.prisma.product.findMany({ where: { tenantId, active: true }, select: { id: true, name: true, stock: true, minStock: true, unit: true } }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: orderWhere, product: { tenantId } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);
    for (const order of orders) {
      const period = months.find((entry) => entry.key === monthKey(order.createdAt));
      if (!period) continue;
      period.totalCents += order.totalCents;
      period.ordersCount++;
    }
    const sellerProducts = await this.prisma.product.findMany({
      where: { tenantId, id: { in: bestSellers.map((item) => item.productId) } },
      select: { id: true, name: true, unit: true },
    });
    const lowStock = products.filter((product) => product.stock <= product.minStock).sort((a, b) => a.stock - b.stock);
    return {
      monthRevenueCents: months[5].totalCents,
      monthOrdersCount: months[5].ordersCount,
      productsCount,
      customersCount,
      monthlySales: months,
      topProducts: bestSellers.map((item) => {
        const product = sellerProducts.find((entry) => entry.id === item.productId);
        if (!product) throw new Error('Produto das vendas não encontrado na empresa');
        return { ...product, quantity: item._sum.quantity ?? 0 };
      }),
      lowStock: lowStock.slice(0, 5),
      lowStockCount: lowStock.length,
    };
  }

  async salesByPeriod(tenantId: string) {
    return this.prisma.order.groupBy({ by: ['createdAt'], where: { tenantId }, _sum: { totalCents: true } });
  }

  async salesBySeller(tenantId: string) {
    return this.prisma.order.groupBy({ by: ['sellerId'], where: { tenantId }, _sum: { totalCents: true } });
  }

  async salesByCustomer(tenantId: string) {
    return this.prisma.order.groupBy({ by: ['customerId'], where: { tenantId }, _sum: { totalCents: true } });
  }

  async salesByProduct(tenantId: string) {
    return this.prisma.orderItem.groupBy({ by: ['productId'], where: { order: { tenantId } }, _sum: { quantity: true } });
  }

  async topProducts(tenantId: string, limit = 5) {
    return this.prisma.orderItem.findMany({
      where: { order: { tenantId } },
      include: { product: true },
      take: limit,
      orderBy: { quantity: 'desc' },
    });
  }

  async lowStock(tenantId: string) {
    const products = await this.prisma.product.findMany({ where: { tenantId, active: true } });
    return products.filter((product) => product.stock <= product.minStock);
  }

  async accountsReceivableSummary(tenantId: string) {
    const items = await this.prisma.accountsReceivable.findMany({ where: { tenantId } });
    const total = items.reduce((a, i) => a + i.totalCents, 0);
    const received = items.reduce((a, i) => a + i.receivedCents, 0);
    return { totalCents: total, receivedCents: received, pendingCents: total - received };
  }
}