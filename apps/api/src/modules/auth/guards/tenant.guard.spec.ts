import { Test } from '@nestjs/testing';
import { TenantGuard } from './tenant.guard';
import { PrismaService } from '../../prisma/prisma.service';

class MockPrisma {
  tenant = { findUnique: jest.fn() };
  tenantUser = { findUnique: jest.fn() };
}

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TenantGuard,
        { provide: PrismaService, useFactory: () => new MockPrisma() },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});