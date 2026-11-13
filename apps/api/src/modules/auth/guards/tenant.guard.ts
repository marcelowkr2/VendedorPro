import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantIsolationError } from '../../../common/exceptions/app.exception';

interface AuthenticatedRequest extends Request {
  user?: any;
  tenant?: any;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = req.headers['x-tenant-id'] as string;
    const user = req.user;

    if (!tenantId) {
      throw new TenantIsolationError('Header X-tenant-id é obrigatório');
    }

    if (!user) return false;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.active) {
      throw new TenantIsolationError('Tenant inativo ou inexistente');
    }

    const tu = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });
    if (!tu) {
      throw new TenantIsolationError('Você não pertence a esta empresa');
    }

    req.tenant = { tenantId, tenant, role: tu.role };
    return true;
  }
}