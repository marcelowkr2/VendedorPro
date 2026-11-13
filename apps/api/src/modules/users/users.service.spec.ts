import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenError } from '../../common/exceptions/app.exception';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'target', role: 'admin_empresa', active: true, tenants: [{ tenantId: 'tenant' }] }),
        update: jest.fn().mockResolvedValue({ id: 'target', active: false }),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('revokes sessions and records the status change in the transaction', async () => {
    await service.setActive('target', false, 'admin');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { active: false, tokenVersion: { increment: 1 } },
    }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'USER_STATUS_UPDATE', tenantId: 'tenant', userId: 'admin' }),
    });
  });

  it('does not change global administrators or the current actor', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'target', role: 'admin_global', active: true, tenants: [] });
    await expect(service.setActive('target', false, 'admin')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.setActive('target', false, 'target')).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
