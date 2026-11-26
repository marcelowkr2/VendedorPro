import { Test } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { stockAdjustmentSchema } from '@vendedorpro/shared';

class MockPrisma {
  product = { findFirst: jest.fn(), findFirstOrThrow: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() };
  stockMovement = { findMany: jest.fn(), create: jest.fn() };
  auditLog = { create: jest.fn() };
  $transaction = jest.fn((cb) => cb(this));
}

describe('StockService', () => {
  let service: StockService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = new MockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns product names and codes for the current tenant movements', async () => {
    const movements = [{ product: { name: 'Café', code: 'CAF01' } }];
    prisma.stockMovement.findMany.mockResolvedValue(movements);
    await expect(service.movements('tenant-1')).resolves.toEqual(movements);
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', product: { tenantId: 'tenant-1' } },
      include: { product: { select: { name: true, code: true } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  });

    it('updates stock atomically, records the movement and audit for the tenant', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.findFirstOrThrow.mockResolvedValue({ id: 'p1', stock: 7 });
      prisma.stockMovement.create.mockResolvedValue({ id: 'm1', quantity: 3 });
      await expect(service.adjust('tenant-1', { productId: 'p1', type: 'out', quantity: 3 }, 'user-1')).resolves.toEqual({ id: 'p1', stock: 7 });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', tenantId: 'tenant-1', active: true, stock: { gte: 3 } },
        data: { stock: { decrement: 3 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({ data: {
        productId: 'p1', tenantId: 'tenant-1', type: 'out', quantity: 3, reason: '',
      } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1', action: 'STOCK_ADJUST' }) }));
    });

    it('does not record a movement when the stock is insufficient or product is unavailable', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 0 });
      prisma.product.findFirst.mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce(null);
      await expect(service.adjust('tenant-1', { productId: 'p1', type: 'out', quantity: 3 }, 'user-1')).rejects.toThrow('Estoque insuficiente');
      await expect(service.adjust('tenant-1', { productId: 'p1', type: 'out', quantity: 3 }, 'user-1')).rejects.toThrow('Produto ativo não encontrado');
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('allows adjustment to zero, but rejects zero entries and withdrawals', async () => {
      expect(stockAdjustmentSchema.safeParse({ productId: 'p1', type: 'adjustment', quantity: 0 }).success).toBe(true);
      for (const type of ['in', 'out']) {
        expect(stockAdjustmentSchema.safeParse({ productId: 'p1', type, quantity: 0 }).success).toBe(false);
      }
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.findFirstOrThrow.mockResolvedValue({ id: 'p1', stock: 0 });
      prisma.stockMovement.create.mockResolvedValue({ id: 'm1' });
      await service.adjust('tenant-1', { productId: 'p1', type: 'adjustment', quantity: 0 }, 'user-1');
      expect(prisma.product.updateMany).toHaveBeenCalledWith({ where: { id: 'p1', tenantId: 'tenant-1', active: true }, data: { stock: 0 } });
    });

    it('lists only active products for the selected tenant', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.products('tenant-1');
      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId: 'tenant-1', active: true },
      }));
  });
});