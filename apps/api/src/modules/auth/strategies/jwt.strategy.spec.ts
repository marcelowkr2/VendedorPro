import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('rejects inactive users and tokens issued before deactivation', async () => {
    const user = { id: 'user', active: false, tokenVersion: 1 };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      tenantUser: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
      ],
    }).compile();
    const strategy = module.get(JwtStrategy);
    const payload = { sub: 'user', email: 'user@example.test', role: 'admin_empresa', tokenVersion: 1 };
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.user.findUnique.mockResolvedValue({ ...user, active: true });
    await expect(strategy.validate({ ...payload, tokenVersion: 0 })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(strategy.validate(payload)).resolves.toMatchObject({ id: 'user' });
  });
});
