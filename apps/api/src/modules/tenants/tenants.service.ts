import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.tenant.findMany({
      include: { subscriptions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name: string; slug: string }) {
    return this.prisma.tenant.create({ data });
  }

  async findOne(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new Error('Tenant não encontrado');
    return t;
  }

  async toggleStatus(id: string, active: boolean) {
    return this.prisma.tenant.update({ where: { id }, data: { active } });
  }

  async delete(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { active: false } });
  }
}