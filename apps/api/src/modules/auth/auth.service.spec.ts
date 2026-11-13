import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  const user = { id: 'user', email: 'user@example.test', name: 'User', role: 'admin_empresa', active: true, tokenVersion: 0 };
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    tenant: { create: jest.Mock };
    tenantUser: { create: jest.Mock; findMany: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwt: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue(user), update: jest.fn() },
      tenant: { create: jest.fn().mockResolvedValue({ id: 'tenant' }) },
      tenantUser: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    jwt = { sign: jest.fn().mockReturnValue('token'), verify: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: (key: string) => key === 'SALT_ROUNDS' ? 4 : 'secret' } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('creates the user, private tenant, membership and audit in one transaction', async () => {
    await service.register(user.email, 'password123', user.name);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: user.email, role: 'admin_empresa' }) });
    expect(prisma.tenant.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'Conta de User' }) });
    expect(prisma.tenantUser.create).toHaveBeenCalledWith({ data: { userId: 'user', tenantId: 'tenant', role: 'admin_empresa' } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenantId: 'tenant', action: 'USER_CREATE' }) });
  });

  it('reports an email conflict even when another registration wins the race', async () => {
    prisma.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002', clientVersion: 'test', meta: { target: ['email'] },
    }));
    await expect(service.register(user.email, 'password123', user.name)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });

  it('does not mask other database errors', async () => {
    const failure = new Error('database unavailable');
    prisma.user.create.mockRejectedValue(failure);
    await expect(service.register(user.email, 'password123', user.name)).rejects.toBe(failure);
  });

  it('rejects inactive users at login and refresh', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, active: false });
    jwt.verify.mockReturnValue({ sub: user.id, tokenVersion: 0 });
    await expect(service.login(user.email, 'password123')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh('old')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects old tokens after reactivation and allows a new login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...user, tokenVersion: 1, passwordHash: await bcrypt.hash('password123', 4),
    });
    jwt.verify.mockReturnValue({ sub: user.id, tokenVersion: 0 });
    await expect(service.refresh('old')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.login(user.email, 'password123')).resolves.toMatchObject({ user: { id: user.id } });
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ tokenVersion: 1 }), expect.anything());
  });
});
