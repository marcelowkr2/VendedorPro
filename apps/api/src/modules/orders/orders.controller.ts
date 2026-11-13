import { Controller, Get, Post, Param, Patch, Delete, Body, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OrdersService } from './orders.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { orderInputSchema } from '@vendedorpro/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get()
  @Permissions('ORDER_READ')
  async list(@TenantId() tenantId: string, @Query('limit') limit?: string) {
    return this.svc.list(tenantId, Number(limit) || 50);
  }

  @Post()
  @Permissions('ORDER_CREATE')
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') sellerId: string,
    @Body(new ZodValidationPipe(orderInputSchema)) body: any,
  ) {
    return this.svc.create(tenantId, body, sellerId);
  }

  @Get(':id')
  @Permissions('ORDER_READ')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findOne(tenantId, id);
  }

  @Get(':id/pdf')
  @Permissions('ORDER_READ')
  async pdf(@TenantId() tenantId: string, @Param('id') id: string, @Res() res: any) {
    const pdfBuffer = await this.svc.generatePdf(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pedido-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  }

  @Patch(':id/status')
  @Permissions('ORDER_UPDATE')
  async status(@TenantId() tenantId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateStatus(tenantId, id, status);
  }

  @Delete(':id')
  @Permissions('ORDER_DELETE')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id);
  }
}