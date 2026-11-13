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

  it('generatePdf returns buffer', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: '1', number: 'PED-2026-00001', status: 'separating',
      totalCents: 1000, customer: { name: 'João' },
      items: [{ productId: 'p1', quantity: 1, priceCents: 1000 }],
    } as any);

    const buf = await service.generatePdf('tenant-1', '1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8').slice(0, 8)).toBe('%PDF-1.4');
  });
});