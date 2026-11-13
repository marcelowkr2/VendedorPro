import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AdminService } from './admin.service';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('indicators')
  @Permissions('ADMIN_GLOBAL')
  async indicators() {
    return this.svc.indicators();
  }

  @Get('tenants')
  @Permissions('ADMIN_GLOBAL')
  async listTenants() {
    return this.svc.listTenants();
  }

  @Get('users')
  @Permissions('ADMIN_GLOBAL')
  async listUsers() {
    return this.svc.listUsers();
  }
}