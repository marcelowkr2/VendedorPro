import { Test } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GoalsService tenant isolation', () => {
  it('uses the authenticated tenant even if the body contains another tenant', async () => {
    const create = jest.fn();
    const module = await Test.createTestingModule({
      providers: [GoalsService, { provide: PrismaService, useValue: { salesGoal: { create } } }],
    }).compile();
    await module.get(GoalsService).create('own', { tenantId: 'other', targetCents: 500 });
    expect(create).toHaveBeenCalledWith({ data: { tenantId: 'own', targetCents: 500 } });
  });
});
