import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenError, NotFoundError } from '../../common/exceptions/app.exception';
import { audit } from '../../audit';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, active: true },
    });
    if (!u) throw new NotFoundError();
    return u;
  }

  async setActive(id: string, active: boolean, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, active: true, tenants: { select: { tenantId: true }, take: 1 } },
      });
      if (!before) throw new NotFoundError('Usuário não encontrado');
      if (before.id === actorId || before.role === 'admin_global') {
        throw new ForbiddenError('Não é permitido alterar o status de administradores globais');
      }
      if (before.active === active) return { id: before.id, active: before.active };
      const user = await tx.user.update({
        where: { id },
        data: { active, ...(!active ? { tokenVersion: { increment: 1 } } : {}) },
        select: { id: true, active: true },
      });
      await audit(tx, 'USER_STATUS_UPDATE', before.tenants[0]?.tenantId ?? 'global', id,
        { active: before.active }, { active: user.active }, actorId);
      return user;
    });
  }
}