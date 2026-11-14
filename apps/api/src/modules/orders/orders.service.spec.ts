import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

class MockPrisma {
  order = { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() };
  product = { findFirst: jest.fn(), update: jest.fn() };
  stockMovement = { create: jest.fn() };
  $transaction = jest.fn((cb: any) => cb(this));
}

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = new MockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates the PDF from the order and tenant-scoped product details', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: '1', number: 'PED-2026-00001', status: 'separating',
      createdAt: new Date('2026-11-14T12:00:00Z'),
      subtotalCents: 1000, discountCents: 0, totalCents: 1000,
      customer: { name: 'João', tenantId: 'tenant-1' },
      items: [{ productId: 'p1', quantity: 1, priceCents: 1000, product: { name: 'Café', code: 'CAF01', tenantId: 'tenant-1' } }],
    });

    const buf = await service.generatePdf('tenant-1', '1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8', 0, 5)).toBe('%PDF-');
    expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '1', tenantId: 'tenant-1' },
      include: expect.objectContaining({ items: expect.objectContaining({ include: expect.any(Object) }) }),
    }));
  });

  it('rejects a PDF whose product belongs to another tenant', async () => {
    prisma.order.findFirst.mockResolvedValue({
      customer: { tenantId: 'tenant-1' }, items: [{ product: { tenantId: 'tenant-2' } }],
    });
    await expect(service.generatePdf('tenant-1', '1')).rejects.toThrow('Pedido contém dados de outra empresa');
  });
});