import { Controller, Get, Post, Param, Patch, Body, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { QuotesService } from './quotes.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { quoteInputSchema } from '@vendedorpro/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('quotes')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class QuotesController {
  constructor(private readonly svc: QuotesService) {}

  @Get()
  @Permissions('QUOTE_READ')
  async list(@TenantId() tenantId: string, @Query('limit') limit?: string) {
    return this.svc.list(tenantId, Number(limit) || 50);
  }

  @Post()
  @Permissions('QUOTE_CREATE')
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') sellerId: string,
    @Body(new ZodValidationPipe(quoteInputSchema)) body: any,
  ) {
    return this.svc.create(tenantId, body, sellerId);
  }

  @Get(':id')
  @Permissions('QUOTE_READ')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findOne(tenantId, id);
  }

  @Get(':id/pdf')
  @Permissions('QUOTE_READ')
  async pdf(@TenantId() tenantId: string, @Param('id') id: string, @Res() res: any) {
    const pdfBuffer = await this.svc.generatePdf(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="orcamento-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  }

  @Patch(':id/status')
  @Permissions('QUOTE_UPDATE')
  async status(@TenantId() tenantId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateStatus(tenantId, id, status);
  }

  @Post(':id/convert')
  @Permissions('QUOTE_CONVERT')
  async convert(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.convertToOrder(tenantId, id);
  }
}