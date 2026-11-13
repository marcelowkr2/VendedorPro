import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReportsService } from './reports.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('dashboard')
  @Permissions('REPORT_READ')
  async dashboard(@TenantId() tenantId: string) {
    return this.svc.dashboard(tenantId);
  }

  @Get('sales-by-period')
  @Permissions('REPORT_READ')
  async salesByPeriod(@TenantId() tenantId: string) {
    return this.svc.salesByPeriod(tenantId);
  }

  @Get('sales-by-seller')
  @Permissions('REPORT_READ')
  async salesBySeller(@TenantId() tenantId: string) {
    return this.svc.salesBySeller(tenantId);
  }

  @Get('sales-by-customer')
  @Permissions('REPORT_READ')
  async salesByCustomer(@TenantId() tenantId: string) {
    return this.svc.salesByCustomer(tenantId);
  }

  @Get('sales-by-product')
  @Permissions('REPORT_READ')
  async salesByProduct(@TenantId() tenantId: string) {
    return this.svc.salesByProduct(tenantId);
  }

  @Get('top-products')
  @Permissions('REPORT_READ')
  async topProducts(@TenantId() tenantId: string, @Query('limit') limit?: string) {
    return this.svc.topProducts(tenantId, Number(limit) || 5);
  }

  @Get('low-stock')
  @Permissions('REPORT_READ')
  async lowStock(@TenantId() tenantId: string) {
    return this.svc.lowStock(tenantId);
  }

  @Get('accounts-receivable-summary')
  @Permissions('FINANCE_READ')
  async arSummary(@TenantId() tenantId: string) {
    return this.svc.accountsReceivableSummary(tenantId);
  }
}