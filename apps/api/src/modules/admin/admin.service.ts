import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async indicators() {
    const [tenants, users] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
    ]);
    return { tenantCount: tenants, userCount: users };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, active: true, createdAt: true,
        tenants: { select: { tenant: { select: { id: true, name: true, active: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}