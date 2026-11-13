import { Test } from '@nestjs/testing';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../prisma/prisma.service';

class MockPrisma {
  quote = { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() };
}

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = new MockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generatePdf returns buffer', async () => {
    prisma.quote.findFirst.mockResolvedValue({
      id: '1', number: 'ORC-2026-00001', status: 'draft',
      totalCents: 1000, customer: { name: 'João' },
      items: [{ productId: 'p1', quantity: 1, priceCents: 1000 }],
    } as any);

    const buf = await service.generatePdf('tenant-1', '1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8').slice(0, 8)).toBe('%PDF-1.4');
  });
});