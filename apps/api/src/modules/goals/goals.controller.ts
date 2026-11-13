import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GoalsService } from './goals.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Controller('goals')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class GoalsController {
  constructor(private readonly svc: GoalsService) {}

  @Get()
  @Permissions('REPORT_READ')
  async list(@TenantId() tenantId: string) {
    return this.svc.list(tenantId);
  }

  @Post()
  @Permissions('REPORT_READ')
  async create(@TenantId() tenantId: string, @Body() body: any) {
    return this.svc.create(tenantId, body);
  }

  @Get(':id/progress')
  @Permissions('REPORT_READ')
  async progress(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.progress(tenantId, id);
  }
}