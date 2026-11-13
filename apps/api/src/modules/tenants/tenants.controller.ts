import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantsService } from './tenants.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantIsolationError } from '../../common/exceptions/app.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantsController {
  constructor(private readonly svc: TenantsService) {}

  @Get()
  @Permissions('admin_global')
  async list(@Query('tenantId') tenantId: string) {
    return this.svc.list();
  }

  @Post()
  @Permissions('admin_global')
  async create(@Body() body: { name: string; slug: string }) {
    return this.svc.create(body);
  }

  @Get(':id')
  @Permissions('ADMIN_GLOBAL')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id/status')
  @Permissions('admin_global')
  async status(@Param('id') id: string, @Body('active') active: boolean) {
    return this.svc.toggleStatus(id, active);
  }

  @Delete(':id')
  @Permissions('admin_global')
  async delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}