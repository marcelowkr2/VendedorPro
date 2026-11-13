import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { hasPermission } from '@vendedorpro/shared';
import { ForbiddenError } from '../../../common/exceptions/app.exception';

export const PERMISSIONS_KEY = 'permissions';

interface AuthenticatedRequest extends Request {
  user?: any;
  tenant?: any;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.tenant?.role || req.user?.role;
    if (!role) return false;

    const has = required.some((p) => hasPermission(role, p));
    if (!has) throw new ForbiddenError('Permissão insuficiente');
    return true;
  }
}