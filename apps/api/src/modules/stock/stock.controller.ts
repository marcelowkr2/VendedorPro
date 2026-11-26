import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { StockService } from './stock.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { stockAdjustmentSchema } from '@vendedorpro/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('stock')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly svc: StockService) {}

  @Post('adjust')
  @Permissions('PRODUCT_UPDATE')
  async adjust(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Body(new ZodValidationPipe(stockAdjustmentSchema)) body: any) {
    return this.svc.adjust(tenantId, body, userId);
  }

  @Get('products')
  @Permissions('STOCK_READ')
  async products(@TenantId() tenantId: string) {
    return this.svc.products(tenantId);
  }

  @Get('movements')
  @Permissions('STOCK_READ')
  async movements(@TenantId() tenantId: string, @Query('limit') limit?: string) {
    return this.svc.movements(tenantId, Number(limit) || 20);
  }

  @Get('low-stock')
  @Permissions('STOCK_READ')
  async lowStock(@TenantId() tenantId: string) {
    return this.svc.lowStock(tenantId);
  }
}