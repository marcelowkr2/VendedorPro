import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService dashboardPerformance', () => {
  afterEach(() => jest.useRealTimers());

  it('groups orders by São Paulo month and scopes every query to the tenant', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-03-01T02:30:00Z'));
    const orderFind = jest.fn().mockResolvedValue([
      { createdAt: new Date('2025-03-01T02:00:00Z'), totalCents: 1500 },
      { createdAt: new Date('2025-01-15T12:00:00Z'), totalCents: 2500 },
    ]);
    const productCount = jest.fn().mockResolvedValue(2);
    const customerCount = jest.fn().mockResolvedValue(3);
    const productFind = jest.fn()
      .mockResolvedValueOnce([
        { id: 'p1', name: 'Arroz', stock: 2, minStock: 3, unit: 'UN' },
        { id: 'p2', name: 'Feijão', stock: 5, minStock: 3, unit: 'kg' },
      ])
      .mockResolvedValueOnce([{ id: 'p1', name: 'Arroz', unit: 'UN' }]);
    const groupBy = jest.fn().mockResolvedValue([{ productId: 'p1', _sum: { quantity: 7 } }]);
    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: {
        order: { findMany: orderFind }, product: { count: productCount, findMany: productFind },
        customer: { count: customerCount }, orderItem: { groupBy },
      } }],
    }).compile();

    const result = await module.get(ReportsService).dashboardPerformance('tenant-a');
    const where = {
      tenantId: 'tenant-a', active: true, status: { not: 'cancelled' },
      createdAt: { gte: new Date('2024-09-01T03:00:00Z'), lte: new Date('2025-03-01T02:30:00Z') },
    };
    expect(orderFind).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { order: where, product: { tenantId: 'tenant-a' } },
      _sum: { quantity: true }, take: 5,
    }));
    expect(productCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', active: true } });
    expect(customerCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', active: true } });
    expect(productFind).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { tenantId: 'tenant-a', active: true } }));
    expect(productFind).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { tenantId: 'tenant-a', id: { in: ['p1'] } } }));
    expect(result.monthlySales.map((item) => item.key)).toEqual(['2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02']);
    expect(result.monthlySales[4]).toEqual({ key: '2025-01', totalCents: 2500, ordersCount: 1 });
    expect(result.monthRevenueCents).toBe(1500);
    expect(result.monthOrdersCount).toBe(1);
    expect(result.topProducts).toEqual([{ id: 'p1', name: 'Arroz', quantity: 7, unit: 'UN' }]);
    expect(result.lowStockCount).toBe(1);
    expect(result.lowStock.map((item) => item.id)).toEqual(['p1']);
  });

  it('returns six empty months when the tenant has no data', async () => {
    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: {
        order: { findMany: jest.fn().mockResolvedValue([]) },
        product: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
        customer: { count: jest.fn().mockResolvedValue(0) },
        orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
      } }],
    }).compile();
    const result = await module.get(ReportsService).dashboardPerformance('empty');
    expect(result.monthlySales).toHaveLength(6);
    expect(result.monthlySales.every((month) => month.ordersCount === 0 && month.totalCents === 0)).toBe(true);
    expect(result.topProducts).toEqual([]);
    expect(result.lowStock).toEqual([]);
  });
});
