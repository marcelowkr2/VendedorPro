import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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