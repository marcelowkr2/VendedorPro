import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FinanceService } from './finance.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paymentInputSchema } from '@vendedorpro/shared';

@Controller('finance')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  @Get('payment-conditions')
  @Permissions('FINANCE_READ')
  async conditions(@TenantId() tenantId: string) {
    return this.svc.listPaymentConditions(tenantId);
  }

  @Get('receivables')
  @Permissions('FINANCE_READ')
  async receivables(@TenantId() tenantId: string, @Query('limit') limit?: string) {
    return this.svc.listReceivables(tenantId, Number(limit) || 50);
  }

  @Post('receivables/:id/payments')
  @Permissions('FINANCE_READ')
  async pay(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(paymentInputSchema)) body: { amountCents: number; method?: string },
  ) {
    return this.svc.recordPayment(id, body.amountCents, tenantId, body.method);
  }

  @Get('summary')
  @Permissions('FINANCE_READ')
  async summary(@TenantId() tenantId: string) {
    return this.svc.summary(tenantId);
  }
}