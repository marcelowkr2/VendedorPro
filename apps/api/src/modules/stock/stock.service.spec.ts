import { Test } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';

class MockPrisma {
  product = { findFirst: jest.fn(), update: jest.fn() };
  stockMovement = { findMany: jest.fn(), create: jest.fn() };
  $transaction = jest.fn();
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
});