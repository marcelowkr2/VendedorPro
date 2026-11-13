import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../../common/exceptions/app.exception';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.salesGoal.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, data: any) {
    return this.prisma.salesGoal.create({ data: { ...data, tenantId } });
  }

  async progress(tenantId: string, id: string) {
    const g = await this.prisma.salesGoal.findFirst({ where: { id, tenantId } });
    if (!g) throw new NotFoundError();

    const orders = await this.prisma.order.findMany({
      where: { tenantId, status: { in: ['delivered', 'shipped'] }, createdAt: { gte: g.startDate, lte: g.endDate } },
    });
    const achieved = orders.reduce((a, o) => a + o.totalCents, 0);

    return { ...g, achievedCents: achieved, percent: g.targetCents ? Math.round((achieved / g.targetCents) * 100) : 0 };
  }
}