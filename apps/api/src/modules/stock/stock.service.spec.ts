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

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useFactory: () => new MockPrisma() },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});