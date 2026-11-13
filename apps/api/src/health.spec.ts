import { Test } from '@nestjs/testing';
import { PrismaService } from './modules/prisma/prisma.service';

describe('PrismaService', () => {
  it('should be defined', () => {
    const svc = new PrismaService();
    expect(svc).toBeDefined();
  });
});